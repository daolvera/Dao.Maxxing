using Dao.Maxxing.Core.Weather;

namespace Dao.Maxxing.Api.Endpoints;

public static class WeatherEndpoints
{
    public static IEndpointRouteBuilder MapWeatherEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/weatherforecast")
            .RequireAuthorization("api")
            .WithTags("Weather");

        group.MapGet("", (IWeatherForecastService weather) => TypedResults.Ok(weather.GetForecast()))
            .WithName("GetWeatherForecast");

        return app;
    }
}
