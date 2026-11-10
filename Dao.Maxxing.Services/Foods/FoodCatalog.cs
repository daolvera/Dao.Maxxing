using Dao.Maxxing.Core.Foods;
using Dao.Maxxing.Services.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Dao.Maxxing.Services.Foods;

internal sealed partial class FoodCatalog(MaxxingDbContext db, ILogger<FoodCatalog> logger) : IFoodCatalog
{
    public async Task<Food> GetOrAddAsync(Food food, CancellationToken cancellationToken)
    {
        if (await FindBySourceAsync(food.Source, cancellationToken) is { } existing) return existing;

        var record = FoodRecord.From(food);
        db.Add(record);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            LogAdded(food.Id, food.Source.Provider);
            return food;
        }
        catch (DbUpdateException)
        {
            // Another request may have saved the same source food first; if so, theirs wins.
            db.Entry(record).State = EntityState.Detached;
            if (await FindBySourceAsync(food.Source, cancellationToken) is { } concurrent) return concurrent;
            throw;
        }
    }

    public async Task<Food?> FindAsync(Guid id, CancellationToken cancellationToken) =>
        (await Foods().FirstOrDefaultAsync(f => f.Id == id, cancellationToken))?.ToFood();

    public async Task<Food?> FindByBarcodeAsync(string barcode, CancellationToken cancellationToken)
    {
        if (Gtin.Normalize(barcode) is not { } gtin) return null;
        // Prefer our own foods, then the most recently fetched.
        var record = await Foods()
            .Where(f => f.Gtin == gtin)
            .OrderBy(f => f.Provider)
            .ThenByDescending(f => f.RetrievedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return record?.ToFood();
    }

    private async Task<Food?> FindBySourceAsync(FoodSource source, CancellationToken cancellationToken) =>
        (await Foods().FirstOrDefaultAsync(
            f => f.Provider == source.Provider && f.ExternalId == source.ExternalId, cancellationToken))?.ToFood();

    private IQueryable<FoodRecord> Foods() => db.Set<FoodRecord>().AsNoTracking();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Added food {FoodId} from {Provider}.")]
    private partial void LogAdded(Guid foodId, FoodSourceProvider provider);
}
