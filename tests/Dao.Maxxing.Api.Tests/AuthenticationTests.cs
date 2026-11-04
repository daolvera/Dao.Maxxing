using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Dao.Maxxing.Api.Authentication;
using Dao.Maxxing.Services.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Tests;

public class AuthenticationTests(SqlServerFixture sql)
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task CurrentUser_WhenSignedOut_ReturnsUnauthorizedProblem()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var response = await factory.CreateHttpsClient().GetAsync("/api/auth/me", Cancel);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(401, (await ReadProblemAsync(response)).GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task CurrentUser_AsOwner_ReturnsOwnerSubject()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var user = await factory.CreateSignedInClient().GetFromJsonAsync<JsonElement>("/api/auth/me", Cancel);

        Assert.Equal(ApiFactory.OwnerSubject, user.GetProperty("id").GetString());
    }

    [Theory]
    [InlineData("/api/auth/me")]
    [InlineData("/api/weatherforecast")]
    public async Task ProtectedEndpoint_AsNonOwner_ReturnsForbiddenProblem(string path)
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var response = await factory.CreateSignedInClient("someone-else").GetAsync(path, Cancel);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(403, (await ReadProblemAsync(response)).GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task MutatingRequest_WithoutCsrfToken_ReturnsBadRequestProblem()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var response = await factory.CreateSignedInClient().PostAsync("/api/auth/logout", null, Cancel);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Invalid antiforgery token.", (await ReadProblemAsync(response)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task MutatingRequest_WithWrongCsrfToken_ReturnsBadRequestProblem()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        var client = factory.CreateSignedInClient();
        await GetCsrfTokenAsync(client); // Sets the antiforgery cookie, so only the header is wrong.

        var response = await PostWithTokenAsync(client, "/api/auth/logout", "not-the-token");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Fact]
    public async Task MutatingRequest_WithCsrfToken_Succeeds()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        var client = factory.CreateSignedInClient();
        var token = await GetCsrfTokenAsync(client);

        var response = await PostWithTokenAsync(client, "/api/auth/logout", token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task GoogleSignIn_ForNonOwner_RedirectsWithoutCreatingSession()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var context = await RaiseGoogleTicketReceivedAsync(factory, "someone-else");

        Assert.True(context.Result?.Handled);
        Assert.Equal("/?authError=not-owner", context.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task GoogleSignIn_ForOwner_ContinuesToSignIn()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var context = await RaiseGoogleTicketReceivedAsync(factory, ApiFactory.OwnerSubject);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task DataProtectionKeys_ArePersistedToTheDatabase()
    {
        await using var factory = new ApiFactory(sql.NewDatabase());

        await GetCsrfTokenAsync(factory.CreateSignedInClient()); // Encrypting the token creates a key.

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MaxxingDbContext>();
        Assert.NotEmpty(await db.DataProtectionKeys.ToListAsync(Cancel));
    }

    [Fact]
    public async Task Startup_WithoutOwner_FailsWithActionableMessage()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        factory.Settings["Authentication:Owner:GoogleSubject"] = "";

        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("Authentication:Owner:GoogleSubject", error.ToString());
    }

    private static async Task<TicketReceivedContext> RaiseGoogleTicketReceivedAsync(ApiFactory factory, string subject)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptionsMonitor<GoogleOptions>>().Get(GoogleDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, subject)], GoogleDefaults.AuthenticationScheme));
        var context = new TicketReceivedContext(
            new DefaultHttpContext { RequestServices = scope.ServiceProvider },
            new AuthenticationScheme(GoogleDefaults.AuthenticationScheme, null, typeof(GoogleHandler)),
            options,
            new AuthenticationTicket(principal, GoogleBffAuthentication.SessionScheme));

        await options.Events.TicketReceived(context);
        return context;
    }

    private static async Task<string> GetCsrfTokenAsync(HttpClient client)
    {
        var body = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf", Cancel);
        return body.GetProperty("token").GetString()!;
    }

    private static Task<HttpResponseMessage> PostWithTokenAsync(HttpClient client, string path, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add(GoogleBffAuthentication.AntiforgeryHeaderName, token);
        return client.SendAsync(request, Cancel);
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(Cancel);
    }
}
