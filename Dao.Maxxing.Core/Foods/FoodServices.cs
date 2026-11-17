namespace Dao.Maxxing.Core.Foods;

/// <summary>Turns provider data into a <see cref="Food"/>. Every provider's results go through it.</summary>
public interface IFoodNormalizer
{
    FoodNormalizationResult Normalize(FoodCandidate candidate);
}

public interface INutritionCalculator
{
    /// <summary>
    /// Nutrients for a portion, or null when the portion can't be converted, such as grams of a food
    /// whose serving weight is unknown, or a serving the food doesn't have.
    /// </summary>
    NutrientAmounts? Calculate(Food food, FoodPortion portion);
}

/// <summary>Stored foods. A food is saved once per source and only changes through an explicit refresh.</summary>
public interface IFoodCatalog
{
    /// <summary>
    /// Saves the food unless one from the same source already exists. Returns the stored food, which
    /// keeps its original ID and values.
    /// </summary>
    Task<Food> GetOrAddAsync(Food food, CancellationToken cancellationToken);

    Task<Food?> FindAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a food by a scanned barcode in any GTIN form (UPC-A, EAN-13, EAN-8, GTIN-14).</summary>
    Task<Food?> FindByBarcodeAsync(string barcode, CancellationToken cancellationToken);
}
