using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Dao.Maxxing.Services.Data;

/// <summary>
/// Lets <c>dotnet ef migrations add</c> build the model without starting the API (which needs secrets).
/// Adding a migration never connects, so the connection string is a placeholder.
/// </summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MaxxingDbContext>
{
    public MaxxingDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<MaxxingDbContext>().UseSqlServer("Server=design-time;Database=maxxing").Options);
}
