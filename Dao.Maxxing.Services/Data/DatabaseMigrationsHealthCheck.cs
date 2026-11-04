using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Dao.Maxxing.Services.Data;

/// <summary>Unhealthy until every migration in this build has been applied to the database.</summary>
internal sealed class DatabaseMigrationsHealthCheck(MaxxingDbContext db) : IHealthCheck
{
    public const string Name = "database-migrations";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).Count();
        return pending == 0
            ? HealthCheckResult.Healthy()
            : new HealthCheckResult(context.Registration.FailureStatus, $"{pending} migrations have not been applied.");
    }
}
