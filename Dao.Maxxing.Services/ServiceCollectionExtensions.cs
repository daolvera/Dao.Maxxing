using Dao.Maxxing.Core.Weather;
using Dao.Maxxing.Services.Weather;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Dao.Maxxing.Services;

public static class ServiceCollectionExtensions
{
    /// <summary>Registers application services and their options. Options are validated when the host starts.</summary>
    public static IServiceCollection AddMaxxingServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddSingleton(TimeProvider.System);

        services.AddOptions<WeatherOptions>()
            .Bind(configuration.GetSection(WeatherOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddScoped<IWeatherForecastService, WeatherForecastService>();

        return services;
    }
}
