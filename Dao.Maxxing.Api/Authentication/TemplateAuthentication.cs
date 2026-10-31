using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Authentication;

public static class TemplateAuthentication
{
    public const string SessionScheme = "ApplicationSession";

    public static void AddTemplateAuthentication(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<IValidateOptions<AuthenticationSettings>, AuthenticationSettingsValidator>();
        builder.Services.AddOptions<AuthenticationSettings>()
            .Bind(builder.Configuration.GetSection(AuthenticationSettings.SectionName))
            .ValidateOnStart();
        builder.Services.AddSingleton(sp =>
            new PublicOrigin(sp.GetRequiredService<IOptions<AuthenticationSettings>>().Value.PublicOriginAuthority));
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            // Retain the framework's trusted-proxy restrictions.
        });
        builder.Services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-XSRF-TOKEN";
            options.Cookie.Name = "__Host-Dao.Antiforgery";
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        });

        builder.Services.AddAuthentication(SessionScheme)
            .AddCookie(SessionScheme, ConfigureSessionCookie)
            .AddGoogle(options =>
            {
                options.SignInScheme = SessionScheme;
                options.Events.OnRemoteFailure = context =>
                {
                    context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                        .CreateLogger("GoogleAuthentication").LogWarning(context.Failure, "Google sign-in failed.");
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
        builder.Services.AddAuthorizationBuilder().AddPolicy("api", policy =>
            policy.AddAuthenticationSchemes(SessionScheme).RequireAuthenticatedUser());
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

    public static async Task InitializeTemplateAuthenticationAsync(this WebApplication app)
    {
        await Task.CompletedTask;
    }

    public static void MapTemplateAuthentication(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/hubs") && context.WebSockets.IsWebSocketRequest &&
                context.Request.Headers.Origin != context.RequestServices.GetRequiredService<PublicOrigin>().Value)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
            if ((context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/hubs")) &&
                !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) &&
                !HttpMethods.IsOptions(context.Request.Method) && context.User.Identity?.IsAuthenticated == true)
            {
                if (!await ValidateAntiforgeryAsync(context)) return;
            }
            await next(context);
        });
        // The session endpoints are browser plumbing used by the hand-written AuthService, not the
        // generated API client, so they stay out of the OpenAPI document.
        var auth = app.MapGroup("/api/auth").ExcludeFromDescription();
        auth.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new { token = tokens.RequestToken });
        })
        .AllowAnonymous();

        auth.MapGet("/me", (HttpContext context) => Results.Ok(new
        {
            id = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier),
            name = context.User.Identity?.Name ?? context.User.FindFirstValue("name"),
        })).RequireAuthorization("api");

        auth.MapGet("/config", (HttpContext context, PublicOrigin origin, IConfiguration configuration) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new { authority = origin.Value, clientId = "angular", scope = "api", origin = origin.Value });
        }).AllowAnonymous();

        auth.MapGet("/login", () => Results.Challenge(
            new AuthenticationProperties { RedirectUri = "/" }, ["Google"])).AllowAnonymous();
        auth.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(SessionScheme);
            return Results.NoContent();
        }).RequireAuthorization("api");
    }

    public static async Task<bool> ValidateAntiforgeryAsync(HttpContext context)
    {
        try
        {
            await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
            return true;
        }
        catch (AntiforgeryValidationException exception)
        {
            context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Antiforgery")
                .LogWarning(exception, "Rejected request with an invalid antiforgery token.");
            await TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid antiforgery token.",
                detail: "Reload the page and try again.").ExecuteAsync(context);
            return false;
        }
    }
}

public sealed record PublicOrigin(string Value);
