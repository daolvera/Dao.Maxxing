using Dao.Maxxing.Services.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Services.Tests;

public class DatabaseTests
{
    [Fact]
    public void Model_HasNoChangesMissingFromMigrations()
    {
        using var db = new DesignTimeDbContextFactory().CreateDbContext([]);

        Assert.False(db.Database.HasPendingModelChanges(),
            "The model changed without a migration. Run: dotnet ef migrations add <Name> --project Dao.Maxxing.Services --output-dir Data/Migrations");
    }

    [Fact]
    public void AddMaxxingServices_ReadsConnectionStringAndMigratesOnStartupByDefault()
    {
        using var provider = BuildProvider(new() { ["ConnectionStrings:maxxing"] = "Server=sql;Database=maxxing" });

        var options = provider.GetRequiredService<IOptions<DatabaseOptions>>().Value;

        Assert.Equal("Server=sql;Database=maxxing", options.ConnectionString);
        Assert.True(options.ApplyMigrationsOnStartup);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void AddMaxxingServices_RejectsMissingConnectionString(string? connectionString)
    {
        using var provider = BuildProvider(new() { ["ConnectionStrings:maxxing"] = connectionString });

        var error = Assert.Throws<OptionsValidationException>(() => provider.GetRequiredService<IOptions<DatabaseOptions>>().Value);
        Assert.Contains("ConnectionStrings:maxxing", error.Message);
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new ServiceCollection()
            .AddLogging()
            .AddMaxxingServices(configuration)
            .BuildServiceProvider(validateScopes: true);
    }
}
