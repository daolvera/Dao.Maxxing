using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Tests;

/// <summary>
/// Runs the API in-process under a "Testing" environment (no user secrets, no developer exception page).
/// Requests carrying <see cref="TestAuthHandler.UserHeader"/> are signed in as that Google subject; the
/// test scheme replaces the session cookie as the default, so the real <c>api</c> policy (owner check)
/// and CSRF middleware still run. The database is real
/// SQL Server from <see cref="SqlServerFixture"/>, migrated on startup as in every environment.
/// </summary>
public class ApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    public Dictionary<string, string?> Settings { get; } = new()
    {
        ["ConnectionStrings:maxxing"] = connectionString,
        ["Authentication:PublicOrigin"] = "https://localhost",
        ["Authentication:Google:ClientId"] = "test-client-id",
        ["Authentication:Google:ClientSecret"] = "test-client-secret",
        ["Authentication:Owner:GoogleSubject"] = OwnerSubject,
    };

    public const string OwnerSubject = "test-owner-subject";

    public Action<IServiceCollection>? ConfigureServices { get; set; }

    public string Environment { get; init; } = "Testing";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environment);
        foreach (var (key, value) in Settings) builder.UseSetting(key, value);
        builder.ConfigureServices(services =>
        {
            services.AddAuthentication().AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, null);
            services.PostConfigure<AuthenticationOptions>(options => options.DefaultScheme = TestAuthHandler.SchemeName);
            ConfigureServices?.Invoke(services);
        });
    }

    /// <summary>A client over HTTPS (the app's cookies are Secure) that keeps cookies between requests.</summary>
    public HttpClient CreateHttpsClient() => CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });

    /// <summary>Signs in as the owner, or as another Google account when <paramref name="subject"/> is given.</summary>
    public HttpClient CreateSignedInClient(string subject = OwnerSubject)
    {
        var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, subject);
        return client;
    }
}

public sealed class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string UserHeader = "X-Test-User";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var user)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user.ToString())], SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
