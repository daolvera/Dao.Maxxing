using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Tests;

/// <summary>
/// Runs the API in-process under a "Testing" environment (no user secrets, no developer exception page).
/// Requests carrying <see cref="TestAuthHandler.UserHeader"/> are signed in. The database is real
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
    };

    public Action<IServiceCollection>? ConfigureServices { get; set; }

    public string Environment { get; init; } = "Testing";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environment);
        foreach (var (key, value) in Settings) builder.UseSetting(key, value);
        builder.ConfigureServices(services =>
        {
            services.AddAuthentication().AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, null);
            services.PostConfigure<AuthorizationOptions>(options => options.AddPolicy("api", policy =>
                policy.AddAuthenticationSchemes(TestAuthHandler.SchemeName).RequireAuthenticatedUser()));
            ConfigureServices?.Invoke(services);
        });
    }

    public HttpClient CreateSignedInClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, "test-user");
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
