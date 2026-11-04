using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Dao.Maxxing.Services.Data;

/// <summary>
/// The app's SQL Server database. Services use it directly; endpoints never do (AGENTS.md: Data).
/// Entity configurations live in their feature folders as <see cref="IEntityTypeConfiguration{TEntity}"/>
/// classes and are picked up here.
/// </summary>
public sealed class MaxxingDbContext(DbContextOptions<MaxxingDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    /// <summary>ASP.NET Core Data Protection keys, which encrypt the session and antiforgery cookies.</summary>
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MaxxingDbContext).Assembly);
}
