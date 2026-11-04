using System.Security.Claims;
using Dao.Maxxing.Services.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Authentication;

/// <summary>
/// Backend-for-frontend sign-in: the server runs the Google OAuth flow and keeps the session in an
/// HttpOnly cookie, so the browser never holds a token. Only the configured owner can sign in.
/// See docs/authentication.md.
/// </summary>
public static partial class GoogleBffAuthentication
{
    public const string SessionScheme = "ApplicationSession";
    public const string PolicyName = "api";
    public const string AntiforgeryHeaderName = "X-XSRF-TOKEN";
    private const string LoggerCategory = "Dao.Maxxing.Api.Authentication";

    public static void AddGoogleBffAuthentication(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<IValidateOptions<AuthenticationSettings>, AuthenticationSettingsValidator>();
        builder.Services.AddOptions<AuthenticationSettings>()
            .Bind(builder.Configuration.GetSection(AuthenticationSettings.SectionName))
            .ValidateOnStart();
        builder.Services.AddSingleton(sp =>
            new PublicOrigin(sp.GetRequiredService<IOptions<AuthenticationSettings>>().Value.PublicOriginAuthority));
        builder.Services.AddSingleton<OwnerAccount>();
        builder.Services.AddSingleton<IAuthorizationHandler, OwnerAuthorizationHandler>();

        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            // Retain the framework's trusted-proxy restrictions.
        });

        // Session, correlation, and antiforgery cookies are encrypted with these keys. Keeping them in
        // the database means sessions survive restarts and deployments and work across instances.
        builder.Services.AddDataProtection()
            .SetApplicationName("Dao.Maxxing")
            .PersistKeysToDbContext<MaxxingDbContext>();

        builder.Services.AddAntiforgery(options =>
        {
            options.HeaderName = AntiforgeryHeaderName;
            options.Cookie.Name = "__Host-Dao.Antiforgery";
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        });

        builder.Services.AddAuthentication(SessionScheme)
            .AddCookie(SessionScheme, ConfigureSessionCookie)
            .AddGoogle(options =>
            {
                options.SignInScheme = SessionScheme;
                options.Events.OnTicketReceived = RejectNonOwnerAsync;
                options.Events.OnRemoteFailure = context =>
                {
                    LogGoogleSignInFailed(CreateLogger(context.HttpContext), context.Failure);
                    context.Response.Redirect("/?authError=google");
                    context.HandleResponse();
                    return Task.CompletedTask;
                };
            });
        builder.Services.AddOptions<GoogleOptions>(GoogleDefaults.AuthenticationScheme)
            .Configure<IOptions<AuthenticationSettings>>((options, settings) =>
            {
                options.ClientId = settings.Value.Google.ClientId!;
                options.ClientSecret = settings.Value.Google.ClientSecret!;
            });

        // No explicit scheme: the policy uses the default (session) scheme, which tests replace.
        builder.Services.AddAuthorizationBuilder().AddPolicy(PolicyName, policy =>
            policy.RequireAuthenticatedUser().AddRequirements(new OwnerRequirement()));
    }

    /// <summary>Stops a non-owner's Google sign-in before a session cookie is issued.</summary>
    private static Task RejectNonOwnerAsync(TicketReceivedContext context)
    {
        if (context.HttpContext.RequestServices.GetRequiredService<OwnerAccount>().IsOwner(context.Principal))
        {
            return Task.CompletedTask;
        }

        // The subject is an opaque ID, not personal data. Logging it is how the owner finds their own
        // ID the first time (docs/authentication.md).
        LogNonOwnerRejected(CreateLogger(context.HttpContext), OwnerAccount.SubjectOf(context.Principal));
        context.Response.Redirect("/?authError=not-owner");
        context.HandleResponse();
        return Task.CompletedTask;
    }

    public static void ConfigureSessionCookie(CookieAuthenticationOptions options)
    {
        options.Cookie.Name = "__Host-Dao.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    }

    public static void MapGoogleBffAuthentication(this WebApplication app)
    {
        // CSRF: every mutating /api request from a signed-in browser must echo the antiforgery token
        // in a header. A cross-site form or fetch can send the cookie but cannot read the token.
        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/api") && IsMutating(context.Request.Method) &&
                context.User.Identity?.IsAuthenticated == true &&
                !await ValidateAntiforgeryAsync(context))
            {
                return;
            }
            await next(context);
        });

        // The session endpoints are browser plumbing used by the hand-written AuthService, not the
        // generated API client, so they stay out of the OpenAPI document.
        var auth = app.MapGroup("/api/auth").ExcludeFromDescription();

        // Public: the token is bound to the caller's identity and is useless without their session.
        auth.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var tokens = antiforgery.GetAndStoreTokens(context);
            return TypedResults.Ok(new { token = tokens.RequestToken });
        })
        .WithName("GetCsrfToken")
        .AllowAnonymous();

        auth.MapGet("/me", (HttpContext context) => TypedResults.Ok(new
        {
            id = OwnerAccount.SubjectOf(context.User),
            name = context.User.Identity?.Name ?? context.User.FindFirstValue("name"),
        }))
        .WithName("GetCurrentUser")
        .RequireAuthorization(PolicyName);

        // Public: the frontend reads this before sign-in. It holds no secrets.
        auth.MapGet("/config", (HttpContext context, PublicOrigin origin) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return TypedResults.Ok(new { authority = origin.Value, clientId = "angular", scope = "api", origin = origin.Value });
        })
        .WithName("GetAuthConfig")
        .AllowAnonymous();

        // Public: this starts the Google sign-in flow.
        auth.MapGet("/login", () => TypedResults.Challenge(
            new AuthenticationProperties { RedirectUri = "/" }, [GoogleDefaults.AuthenticationScheme]))
        .WithName("Login")
        .AllowAnonymous();

        auth.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(SessionScheme);
            return TypedResults.NoContent();
        })
        .WithName("Logout")
        .RequireAuthorization(PolicyName);
    }

    private static bool IsMutating(string method) =>
        !HttpMethods.IsGet(method) && !HttpMethods.IsHead(method) &&
        !HttpMethods.IsOptions(method) && !HttpMethods.IsTrace(method);

    private static async Task<bool> ValidateAntiforgeryAsync(HttpContext context)
    {
        try
        {
            await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
            return true;
        }
        catch (AntiforgeryValidationException exception)
        {
            LogAntiforgeryRejected(CreateLogger(context), exception);
            await TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid antiforgery token.",
                detail: "Reload the page and try again.").ExecuteAsync(context);
            return false;
        }
    }

    private static ILogger CreateLogger(HttpContext context) =>
        context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger(LoggerCategory);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Google sign-in failed.")]
    private static partial void LogGoogleSignInFailed(ILogger logger, Exception? exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Rejected Google sign-in for non-owner subject {GoogleSubject}.")]
    private static partial void LogNonOwnerRejected(ILogger logger, string? googleSubject);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Rejected a request with a missing or invalid antiforgery token.")]
    private static partial void LogAntiforgeryRejected(ILogger logger, Exception exception);
}

public sealed record PublicOrigin(string Value);
