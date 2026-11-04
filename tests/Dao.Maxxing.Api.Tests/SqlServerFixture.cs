using Dao.Maxxing.Services.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

[assembly: AssemblyFixture(typeof(Dao.Maxxing.Api.Tests.SqlServerFixture))]

namespace Dao.Maxxing.Api.Tests;

/// <summary>
/// One SQL Server container for the whole test run, the same image the AppHost uses. Requires Docker.
/// <see cref="ConnectionString"/> is a migrated database shared by tests; tests that need an empty or
/// unmigrated database ask for their own with <see cref="NewDatabase"/>.
/// </summary>
public sealed class SqlServerFixture : IAsyncLifetime
{
    private readonly MsSqlContainer container = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest").Build();

    public string ConnectionString => ConnectionStringFor("maxxing_tests");

    /// <summary>A connection string to a database that doesn't exist yet.</summary>
    public string NewDatabase() => ConnectionStringFor($"maxxing_{Guid.NewGuid():N}");

    public static MaxxingDbContext CreateDbContext(string connectionString) =>
        new(new DbContextOptionsBuilder<MaxxingDbContext>().UseSqlServer(connectionString).Options);

    public async ValueTask InitializeAsync()
    {
        await container.StartAsync();
        // Migrated once here so parallel test classes never race to create the shared database.
        await using var db = CreateDbContext(ConnectionString);
        await db.Database.MigrateAsync();
    }

    public ValueTask DisposeAsync() => container.DisposeAsync();

    private string ConnectionStringFor(string database) =>
        new SqlConnectionStringBuilder(container.GetConnectionString()) { InitialCatalog = database }.ConnectionString;
}
