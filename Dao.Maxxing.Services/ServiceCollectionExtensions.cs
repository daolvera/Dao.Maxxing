using Dao.Maxxing.Core.Weather;
using Dao.Maxxing.Services.Data;
using Dao.Maxxing.Services.Weather;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Services;

public static class ServiceCollectionExtensions
{
    /// <summary>Registers application services and their options. Options are validated when the host starts.</summary>
    public static IServiceCollection AddMaxxingServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddSingleton(TimeProvider.System);

        services.AddMaxxingDatabase(configuration);

        services.AddOptions<WeatherOptions>()
            .Bind(configuration.GetSection(WeatherOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddScoped<IWeatherForecastService, WeatherForecastService>();

        return services;
    }

    private static void AddMaxxingDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .Configure(options => options.ConnectionString ??= configuration.GetConnectionString(DatabaseOptions.ConnectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddDbContext<MaxxingDbContext>((sp, options) =>
            options.UseSqlServer(sp.GetRequiredService<IOptions<DatabaseOptions>>().Value.ConnectionString));
        services.AddHostedService<DatabaseMigrator>();
        services.AddHealthChecks()
            .AddCheck<DatabaseMigrationsHealthCheck>(DatabaseMigrationsHealthCheck.Name);
    }
}
