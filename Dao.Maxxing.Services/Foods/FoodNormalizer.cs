using Dao.Maxxing.Core.Foods;

namespace Dao.Maxxing.Services.Foods;

/// <summary>
/// Normalizes provider data to one shape:
/// <list type="bullet">
/// <item>Energy in kcal (kJ ÷ 4.184).</item>
/// <item>Per 100 g whenever a serving weight is known; per serving only when it isn't.</item>
/// <item>A missing macronutrient counts as 0 g. Missing energy is estimated as 4/4/9 kcal per gram.</item>
/// <item>Barcodes as GTIN-14; an invalid barcode is dropped, not fatal.</item>
/// <item>Implausible values (more than 100 g of macros per 100 g, or more than 900 kcal per 100 g) are
/// rejected. These are common in crowd-sourced data where per-100 g and per-serving values were swapped.</item>
/// </list>
/// </summary>
internal sealed class FoodNormalizer(TimeProvider time) : IFoodNormalizer
{
    private const decimal KilojoulesPerKilocalorie = 4.184m;
    private const decimal MaxCaloriesPer100Grams = 900m;
    private const decimal MaxMacroGramsPer100Grams = 100m;
    // Label values are rounded, so allow a little slack before calling them implausible.
    private const decimal Tolerance = 1.05m;
    private const int NameMaxLength = 200;
    private const int ServingLabelMaxLength = 100;

    public FoodNormalizationResult Normalize(FoodCandidate candidate)
    {
        var problems = new List<string>();

        var name = Clean(candidate.Name, NameMaxLength);
        if (name is null) problems.Add("Name is missing.");
        if (string.IsNullOrWhiteSpace(candidate.ExternalId)) problems.Add("Source ID is missing.");

        var servings = NormalizeServings(candidate.Servings);
        var nutrients = ReadNutrients(candidate, problems);

        var basis = candidate.Basis;
        if (nutrients is not null && basis == NutritionBasis.PerServing)
        {
            if (servings.Count == 0)
            {
                problems.Add("Per-serving nutrients need a serving.");
            }
            else if (servings[0].Grams is { } grams)
            {
                nutrients = nutrients.Scale(100m / grams);
                basis = NutritionBasis.Per100Grams;
            }
        }

        if (nutrients is not null && basis == NutritionBasis.Per100Grams)
        {
            var macros = nutrients.ProteinGrams + nutrients.CarbohydrateGrams + nutrients.FatGrams;
            if (macros > MaxMacroGramsPer100Grams * Tolerance)
                problems.Add($"Macronutrients add up to {macros:0.#} g per 100 g, which is impossible.");
            if (nutrients.Calories > MaxCaloriesPer100Grams * Tolerance)
                problems.Add($"Energy is {nutrients.Calories:0} kcal per 100 g, which is impossible.");
        }

        if (problems.Count > 0 || nutrients is null || name is null) return new FoodNormalizationResult(null, problems);

        var food = new Food(
            Guid.CreateVersion7(time.GetUtcNow()),
            name,
            Clean(candidate.Brand, NameMaxLength),
            Gtin.Normalize(candidate.Barcode),
            new FoodSource(candidate.Provider, candidate.ExternalId.Trim(), time.GetUtcNow()),
            basis,
            Round(nutrients),
            servings);
        return new FoodNormalizationResult(food, []);
    }

    private static NutrientAmounts? ReadNutrients(FoodCandidate candidate, List<string> problems)
    {
        decimal?[] values = [candidate.Energy, candidate.ProteinGrams, candidate.CarbohydrateGrams, candidate.FatGrams];
        if (values.Any(v => v < 0))
        {
            problems.Add("Nutrient values can't be negative.");
            return null;
        }

        var protein = candidate.ProteinGrams ?? 0;
        var carbs = candidate.CarbohydrateGrams ?? 0;
        var fat = candidate.FatGrams ?? 0;
        decimal calories;
        if (candidate.Energy is { } energy)
        {
            calories = candidate.EnergyUnit == EnergyUnit.Kilojoules ? energy / KilojoulesPerKilocalorie : energy;
        }
        else if (candidate.ProteinGrams is not null || candidate.CarbohydrateGrams is not null || candidate.FatGrams is not null)
        {
            calories = protein * 4 + carbs * 4 + fat * 9;
        }
        else
        {
            problems.Add("Energy and macronutrients are all missing.");
            return null;
        }
        return new NutrientAmounts(calories, protein, carbs, fat);
    }

    /// <summary>Trims labels, drops blank ones and non-positive weights, and removes duplicates.</summary>
    private static List<FoodServing> NormalizeServings(IReadOnlyList<FoodServing> servings) =>
        servings
            .Select(s => (Label: Clean(s.Label, ServingLabelMaxLength), Grams: s.Grams > 0 ? s.Grams : null))
            .Where(s => s.Label is not null)
            .DistinctBy(s => s.Label, StringComparer.OrdinalIgnoreCase)
            .Select(s => new FoodServing(s.Label!, s.Grams is { } g ? Math.Round(g, 2) : null))
            .ToList();

    private static NutrientAmounts Round(NutrientAmounts n) => new(
        Math.Round(n.Calories, 1), Math.Round(n.ProteinGrams, 2), Math.Round(n.CarbohydrateGrams, 2), Math.Round(n.FatGrams, 2));

    private static string? Clean(string? value, int maxLength)
    {
        var trimmed = value is null ? null : string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrEmpty(trimmed)) return null;
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
