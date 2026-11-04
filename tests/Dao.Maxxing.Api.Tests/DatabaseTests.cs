using System.Net;
using Dao.Maxxing.Services.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;

namespace Dao.Maxxing.Api.Tests;

public class DatabaseTests(SqlServerFixture sql)
{
    [Fact]
    public async Task Startup_AppliesAllMigrationsToANewDatabase()
    {
        await using var factory = new ApiFactory(sql.NewDatabase());

        var response = await factory.CreateClient().GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MaxxingDbContext>();
        Assert.Equal(db.Database.GetMigrations(), await db.Database.GetAppliedMigrationsAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Health_WithUnappliedMigrations_ReturnsServiceUnavailable()
    {
        var connectionString = sql.NewDatabase();
        await using (var db = SqlServerFixture.CreateDbContext(connectionString))
        {
            await db.GetService<IRelationalDatabaseCreator>().CreateAsync(TestContext.Current.CancellationToken);
        }
        await using var factory = new ApiFactory(connectionString);
        factory.Settings["Database:ApplyMigrationsOnStartup"] = "false";

        var response = await factory.CreateClient().GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Startup_WithoutConnectionString_FailsWithActionableMessage()
    {
        await using var factory = new ApiFactory(connectionString: "");

        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("ConnectionStrings:maxxing", error.ToString());
    }
}
