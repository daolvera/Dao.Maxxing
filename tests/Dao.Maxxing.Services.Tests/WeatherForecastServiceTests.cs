using Dao.Maxxing.Core.Weather;
using Dao.Maxxing.Services.Weather;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Services.Tests;

public class WeatherForecastServiceTests
{
    [Fact]
    public void GetForecast_ReturnsConfiguredDaysStartingTomorrow()
    {
        var time = new FixedTimeProvider(new DateTimeOffset(2026, 10, 30, 12, 0, 0, TimeSpan.Zero));
        var service = new WeatherForecastService(
            time, Options.Create(new WeatherOptions { Days = 3 }), NullLogger<WeatherForecastService>.Instance);

        var forecast = service.GetForecast();

        Assert.Equal([new DateOnly(2026, 10, 31), new DateOnly(2026, 11, 1), new DateOnly(2026, 11, 2)],
            forecast.Select(f => f.Date));
        Assert.All(forecast, f => Assert.InRange(f.TemperatureC, -20, 54));
    }

    [Fact]
    public void AddMaxxingServices_ResolvesServiceFromConfiguration()
    {
        using var provider = BuildProvider(new() { ["Weather:Days"] = "7" });
        using var scope = provider.CreateScope();

        Assert.Equal(7, scope.ServiceProvider.GetRequiredService<IWeatherForecastService>().GetForecast().Count);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("15")]
    public void AddMaxxingServices_RejectsOutOfRangeDays(string days)
    {
        using var provider = BuildProvider(new() { ["Weather:Days"] = days });

        var error = Assert.Throws<OptionsValidationException>(() => provider.GetRequiredService<IOptions<WeatherOptions>>().Value);
        Assert.Contains("Days", error.Message);
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new ServiceCollection()
            .AddLogging()
            .AddMaxxingServices(configuration)
            .BuildServiceProvider(validateScopes: true);
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }
}
