using System.ComponentModel.DataAnnotations;

namespace Dao.Maxxing.Services.Weather;

public sealed class WeatherOptions
{
    public const string SectionName = "Weather";

    [Range(1, 14)]
    public int Days { get; set; } = 5;
}
