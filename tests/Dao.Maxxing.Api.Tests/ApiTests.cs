using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Dao.Maxxing.Core.Weather;
using Microsoft.Extensions.DependencyInjection;

namespace Dao.Maxxing.Api.Tests;

public class ApiTests
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WhenSignedOut_ReturnsUnauthorizedProblem()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/weatherforecast", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(401, problem.GetProperty("status").GetInt32());
        Assert.True(problem.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task ProtectedEndpoint_WhenSignedIn_ReturnsForecastFromService()
    {
        await using var factory = new ApiFactory();

        var forecast = await factory.CreateSignedInClient()
            .GetFromJsonAsync<WeatherForecast[]>("/api/weatherforecast", TestContext.Current.CancellationToken);

        Assert.Equal(5, forecast!.Length);
    }

    [Fact]
    public async Task UnhandledException_ReturnsProblemWithoutExceptionDetails()
    {
        await using var factory = new ApiFactory
        {
            ConfigureServices = services => services.AddScoped<IWeatherForecastService, ThrowingWeatherService>(),
        };

        var response = await factory.CreateSignedInClient().GetAsync("/api/weatherforecast", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(500, problem.GetProperty("status").GetInt32());
        Assert.DoesNotContain(ThrowingWeatherService.Secret, problem.GetRawText());
    }

    [Fact]
    public async Task Startup_WithMissingGoogleSettings_FailsWithActionableMessage()
    {
        await using var factory = new ApiFactory();
        factory.Settings["Authentication:Google:ClientSecret"] = "";

        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("Authentication:Google:ClientId and ClientSecret", error.ToString());
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private sealed class ThrowingWeatherService : IWeatherForecastService
    {
        public const string Secret = "internal failure detail";
        public IReadOnlyList<WeatherForecast> GetForecast() => throw new InvalidOperationException(Secret);
    }
}
