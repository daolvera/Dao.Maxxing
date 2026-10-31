using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Services.Data;

/// <summary>
/// Applies pending migrations before the server starts listening, when
/// <see cref="DatabaseOptions.ApplyMigrationsOnStartup"/> is set.
/// </summary>
internal sealed partial class DatabaseMigrator(
    IServiceScopeFactory scopeFactory, IOptions<DatabaseOptions> options, ILogger<DatabaseMigrator> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.ApplyMigrationsOnStartup) return;

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MaxxingDbContext>();
        var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        if (pending.Count == 0)
        {
            LogUpToDate();
            return;
        }

        LogApplying(pending.Count, string.Join(", ", pending));
        await db.Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    [LoggerMessage(Level = LogLevel.Information, Message = "Applying {Count} pending migrations: {Migrations}.")]
    private partial void LogApplying(int count, string migrations);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Database schema is up to date.")]
    private partial void LogUpToDate();
}
