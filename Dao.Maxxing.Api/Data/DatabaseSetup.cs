using Dao.Maxxing.Services.Data;

namespace Dao.Maxxing.Api.Data;

public static class DatabaseSetup
{
    /// <summary>
    /// Adds Aspire's SQL Server integration to the context that AddMaxxingServices registered:
    /// connection retries, a connectivity health check, and OpenTelemetry tracing and metrics.
    /// </summary>
    public static WebApplicationBuilder AddApiDatabase(this WebApplicationBuilder builder)
    {
        builder.EnrichSqlServerDbContext<MaxxingDbContext>();
        return builder;
    }
}
