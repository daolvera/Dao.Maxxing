using Dao.Maxxing.Core.Foods;
using Dao.Maxxing.Services.Foods;

namespace Dao.Maxxing.Services.Tests;

public class GtinTests
{
    [Theory]
    [InlineData("036000291452", "00036000291452")]     // UPC-A
    [InlineData("0036000291452", "00036000291452")]    // EAN-13 form of the same product
    [InlineData("00036000291452", "00036000291452")]   // GTIN-14
    [InlineData("96385074", "00000096385074")]         // EAN-8
    [InlineData(" 0360-0029 1452 ", "00036000291452")] // spaces and dashes from manual entry
    public void Normalize_ReturnsGtin14(string barcode, string expected) =>
        Assert.Equal(expected, Gtin.Normalize(barcode));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("036000291453")]  // wrong check digit
    [InlineData("12345")]         // wrong length
    [InlineData("03600029145A")]  // not digits
    public void Normalize_RejectsInvalidBarcodes(string? barcode) => Assert.Null(Gtin.Normalize(barcode));
}

public class FoodNormalizerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);
    private readonly FoodNormalizer normalizer = new(new FixedTimeProvider(Now));

    private static FoodCandidate Candidate(
        NutritionBasis basis = NutritionBasis.Per100Grams,
        decimal? energy = 250, EnergyUnit unit = EnergyUnit.Kilocalories,
        decimal? protein = 10, decimal? carbs = 30, decimal? fat = 10,
        IReadOnlyList<FoodServing>? servings = null, string name = "Granola", string? barcode = "036000291452") =>
        new(FoodSourceProvider.UsdaFoodDataCentral, "12345", name, "  Acme  ", barcode, basis, energy, unit,
            protein, carbs, fat, servings ?? [new FoodServing("1 cup", 60)]);

    [Fact]
    public void Normalize_KeepsPer100GramValuesAndProvenance()
    {
        var food = normalizer.Normalize(Candidate()).Food!;

        Assert.Equal(NutritionBasis.Per100Grams, food.Basis);
        Assert.Equal(new NutrientAmounts(250, 10, 30, 10), food.Nutrients);
        Assert.Equal(new FoodSource(FoodSourceProvider.UsdaFoodDataCentral, "12345", Now), food.Source);
        Assert.Equal("Acme", food.Brand);
        Assert.Equal("00036000291452", food.Gtin);
        Assert.NotEqual(Guid.Empty, food.Id);
    }

    [Fact]
    public void Normalize_ConvertsPerServingToPer100GramsWhenTheServingWeightIsKnown()
    {
        var food = normalizer.Normalize(Candidate(NutritionBasis.PerServing, energy: 150, protein: 6, carbs: 18, fat: 6)).Food!;

        Assert.Equal(NutritionBasis.Per100Grams, food.Basis);
        Assert.Equal(new NutrientAmounts(250, 10, 30, 10), food.Nutrients);
    }

    [Fact]
    public void Normalize_KeepsPerServingWhenTheServingWeightIsUnknown()
    {
        var food = normalizer.Normalize(Candidate(NutritionBasis.PerServing, servings: [new FoodServing("1 bar", null)])).Food!;

        Assert.Equal(NutritionBasis.PerServing, food.Basis);
        Assert.Equal(250, food.Nutrients.Calories);
    }

    [Fact]
    public void Normalize_ConvertsKilojoulesToKilocalories()
    {
        var food = normalizer.Normalize(Candidate(energy: 1046, unit: EnergyUnit.Kilojoules)).Food!;

        Assert.Equal(250, food.Nutrients.Calories);
    }

    [Fact]
    public void Normalize_EstimatesMissingEnergyAndTreatsMissingMacrosAsZero()
    {
        var food = normalizer.Normalize(Candidate(energy: null, protein: 10, carbs: 30, fat: null)).Food!;

        Assert.Equal(new NutrientAmounts(160, 10, 30, 0), food.Nutrients);
    }

    [Fact]
    public void Normalize_CleansServingsAndDropsAnInvalidBarcode()
    {
        var food = normalizer.Normalize(Candidate(
            servings: [new(" 1  cup ", 60.004m), new("1 CUP", 70), new("", 10), new("1 tbsp", 0)],
            barcode: "123")).Food!;

        Assert.Equal([new FoodServing("1 cup", 60), new FoodServing("1 tbsp", null)], food.Servings);
        Assert.Null(food.Gtin);
    }

    [Theory]
    [InlineData(250, 60, 40, 10, "Macronutrients")]   // 110 g of macros per 100 g
    [InlineData(1000, 0, 0, 100, "Energy")]           // more energy than pure fat
    [InlineData(-1, 10, 30, 10, "negative")]
    [InlineData(null, null, null, null, "missing")]
    public void Normalize_RejectsImplausibleOrMissingNutrients(
        int? energy, int? protein, int? carbs, int? fat, string problem)
    {
        var result = normalizer.Normalize(Candidate(
            energy: (decimal?)energy, protein: (decimal?)protein, carbs: (decimal?)carbs, fat: (decimal?)fat));

        Assert.False(result.Succeeded);
        Assert.Contains(result.Problems, p => p.Contains(problem, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Normalize_CatchesSwappedPerServingValuesAfterConversion()
    {
        // A 30 g serving can't contain 40 g of carbohydrate.
        var result = normalizer.Normalize(Candidate(NutritionBasis.PerServing, energy: 160, protein: 0, carbs: 40, fat: 0,
            servings: [new FoodServing("1 pouch", 30)]));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public void Normalize_RejectsAMissingName() =>
        Assert.Contains("Name is missing.", normalizer.Normalize(Candidate(name: "   ")).Problems);
}

public class NutritionCalculatorTests
{
    private readonly NutritionCalculator calculator = new();

    private static Food Food(NutritionBasis basis, params FoodServing[] servings) => new(
        Guid.NewGuid(), "Granola", null, null,
        new FoodSource(FoodSourceProvider.Local, "1", DateTimeOffset.MinValue),
        basis, new NutrientAmounts(250, 10, 30, 10), servings);

    [Fact]
    public void Grams_ScalePer100GramValues() =>
        Assert.Equal(new NutrientAmounts(125, 5, 15, 5),
            calculator.Calculate(Food(NutritionBasis.Per100Grams), new FoodPortion(50, PortionUnit.Grams)));

    [Fact]
    public void Servings_UseTheNamedServingsWeight() =>
        Assert.Equal(new NutrientAmounts(300, 12, 36, 12),
            calculator.Calculate(
                Food(NutritionBasis.Per100Grams, new FoodServing("1 cup", 60), new FoodServing("1 tbsp", 8)),
                new FoodPortion(2, PortionUnit.Servings, "1 CUP")));

    [Fact]
    public void Servings_DefaultToTheFirstServing() =>
        Assert.Equal(new NutrientAmounts(20, 0.8m, 2.4m, 0.8m),
            calculator.Calculate(Food(NutritionBasis.Per100Grams, new FoodServing("1 tbsp", 8)), new FoodPortion(1, PortionUnit.Servings)));

    [Fact]
    public void PerServingFoods_ScaleByServingCount() =>
        Assert.Equal(new NutrientAmounts(375, 15, 45, 15),
            calculator.Calculate(Food(NutritionBasis.PerServing, new FoodServing("1 bar", null)), new FoodPortion(1.5m, PortionUnit.Servings)));

    [Fact]
    public void Unconvertible_ReturnsNull()
    {
        var perServing = Food(NutritionBasis.PerServing, new FoodServing("1 bar", null), new FoodServing("1 box", null));

        Assert.Null(calculator.Calculate(perServing, new FoodPortion(50, PortionUnit.Grams)));
        Assert.Null(calculator.Calculate(perServing, new FoodPortion(1, PortionUnit.Servings, "1 box")));
        Assert.Null(calculator.Calculate(Food(NutritionBasis.Per100Grams, new FoodServing("1 bar", null)), new FoodPortion(1, PortionUnit.Servings)));
        Assert.Null(calculator.Calculate(Food(NutritionBasis.Per100Grams), new FoodPortion(1, PortionUnit.Servings, "1 cup")));
        Assert.Null(calculator.Calculate(Food(NutritionBasis.Per100Grams), new FoodPortion(-1, PortionUnit.Grams)));
    }
}
