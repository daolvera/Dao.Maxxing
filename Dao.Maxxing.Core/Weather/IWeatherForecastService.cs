namespace Dao.Maxxing.Core.Weather;

public interface IWeatherForecastService
{
    IReadOnlyList<WeatherForecast> GetForecast();
}
