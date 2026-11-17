namespace Dao.Maxxing.Core.Foods;

/// <summary>Where a food's data came from. Stored as a number, so never reorder these.</summary>
public enum FoodSourceProvider
{
    /// <summary>Created in this app, such as a custom food (F5).</summary>
    Local = 0,
    UsdaFoodDataCentral = 1,
    OpenFoodFacts = 2,
}

/// <summary>What a food's <see cref="Food.Nutrients"/> are measured against.</summary>
public enum NutritionBasis
{
    /// <summary>The canonical basis. Any food with a known serving weight is stored this way.</summary>
    Per100Grams = 0,

    /// <summary>
    /// Only for foods whose serving weight is unknown, so grams can't be converted. The nutrients are
    /// for the food's first serving.
    /// </summary>
    PerServing = 1,
}

public enum EnergyUnit
{
    Kilocalories = 0,
    Kilojoules = 1,
}

/// <summary>Calories (kcal) and macronutrients in grams.</summary>
public sealed record NutrientAmounts(decimal Calories, decimal ProteinGrams, decimal CarbohydrateGrams, decimal FatGrams)
{
    public static NutrientAmounts Zero { get; } = new(0, 0, 0, 0);

    public NutrientAmounts Scale(decimal factor) =>
        new(Calories * factor, ProteinGrams * factor, CarbohydrateGrams * factor, FatGrams * factor);
}

/// <summary>A named serving, such as "1 cup" or "1 bar". <see cref="Grams"/> is null when unknown.</summary>
public sealed record FoodServing(string Label, decimal? Grams);

/// <summary>
/// Provenance. <see cref="Provider"/> plus <see cref="ExternalId"/> identify a food uniquely, so a
/// product is stored once however many times it is looked up.
/// </summary>
public sealed record FoodSource(FoodSourceProvider Provider, string ExternalId, DateTimeOffset RetrievedAt);

/// <summary>A food in normalized form: a stable ID, provenance, one nutrient basis, and its servings.</summary>
public sealed record Food(
    Guid Id,
    string Name,
    string? Brand,
    string? Gtin,
    FoodSource Source,
    NutritionBasis Basis,
    NutrientAmounts Nutrients,
    IReadOnlyList<FoodServing> Servings);

/// <summary>
/// A food as a provider reports it, before normalization. With <see cref="NutritionBasis.PerServing"/>,
/// the values are for <c>Servings[0]</c>.
/// </summary>
public sealed record FoodCandidate(
    FoodSourceProvider Provider,
    string ExternalId,
    string Name,
    string? Brand,
    string? Barcode,
    NutritionBasis Basis,
    decimal? Energy,
    EnergyUnit EnergyUnit,
    decimal? ProteinGrams,
    decimal? CarbohydrateGrams,
    decimal? FatGrams,
    IReadOnlyList<FoodServing> Servings);

/// <summary>Either a <see cref="Food"/>, or the reasons the candidate was rejected.</summary>
public sealed record FoodNormalizationResult(Food? Food, IReadOnlyList<string> Problems)
{
    public bool Succeeded => Food is not null;
}

public enum PortionUnit
{
    Grams = 0,
    Servings = 1,
}

/// <summary>An amount of a food. For servings, <see cref="ServingLabel"/> picks one; null means the first.</summary>
public sealed record FoodPortion(decimal Quantity, PortionUnit Unit, string? ServingLabel = null);
