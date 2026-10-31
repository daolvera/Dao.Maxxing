using Microsoft.EntityFrameworkCore;

namespace Dao.Maxxing.Services.Data;

/// <summary>
/// The app's SQL Server database. Services use it directly; endpoints never do (AGENTS.md: Data).
/// Entity configurations live in their feature folders as <see cref="IEntityTypeConfiguration{TEntity}"/>
/// classes and are picked up here.
/// </summary>
public sealed class MaxxingDbContext(DbContextOptions<MaxxingDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MaxxingDbContext).Assembly);
}
