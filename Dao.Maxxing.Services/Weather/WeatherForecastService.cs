using Dao.Maxxing.Core.Weather;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Services.Weather;

internal sealed partial class WeatherForecastService(
    TimeProvider time, IOptions<WeatherOptions> options, ILogger<WeatherForecastService> logger) : IWeatherForecastService
{
    private static readonly string[] Summaries =
    [
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    ];

    public IReadOnlyList<WeatherForecast> GetForecast()
    {
        var today = DateOnly.FromDateTime(time.GetLocalNow().DateTime);
        var days = options.Value.Days;
        var forecast = Enumerable.Range(1, days)
            .Select(index => new WeatherForecast(
                today.AddDays(index),
                Random.Shared.Next(-20, 55),
                Summaries[Random.Shared.Next(Summaries.Length)]))
            .ToArray();
        LogForecastGenerated(days, today);
        return forecast;
    }

    [LoggerMessage(Level = LogLevel.Debug, Message = "Generated a {Days}-day forecast starting after {Today}.")]
    private partial void LogForecastGenerated(int days, DateOnly today);
}
