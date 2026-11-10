using Dao.Maxxing.Core.Foods;

namespace Dao.Maxxing.Services.Foods;

internal sealed class NutritionCalculator : INutritionCalculator
{
    public NutrientAmounts? Calculate(Food food, FoodPortion portion)
    {
        if (portion.Quantity < 0) return null;

        if (portion.Unit == PortionUnit.Grams)
        {
            return food.Basis == NutritionBasis.Per100Grams ? food.Nutrients.Scale(portion.Quantity / 100m) : null;
        }

        var serving = portion.ServingLabel is null
            ? food.Servings.FirstOrDefault()
            : food.Servings.FirstOrDefault(s => string.Equals(s.Label, portion.ServingLabel, StringComparison.OrdinalIgnoreCase));
        if (serving is null) return null;

        return food.Basis switch
        {
            NutritionBasis.Per100Grams when serving.Grams is { } grams => food.Nutrients.Scale(grams * portion.Quantity / 100m),
            // Per-serving values describe the first serving; other servings have no known relation to it.
            NutritionBasis.PerServing when serving == food.Servings[0] =>
                food.Nutrients.Scale(portion.Quantity),
            _ => null,
        };
    }
}
