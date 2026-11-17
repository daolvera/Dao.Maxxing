using Dao.Maxxing.Core.Foods;
using Microsoft.Extensions.DependencyInjection;

namespace Dao.Maxxing.Api.Tests;

/// <summary>The catalog against real SQL Server: identity, provenance, and servings survive a round trip.</summary>
public class FoodCatalogTests(SqlServerFixture sql)
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    private static Food NewFood(string externalId, string? gtin = "00036000291452", FoodSourceProvider provider = FoodSourceProvider.UsdaFoodDataCentral) => new(
        Guid.CreateVersion7(), "Granola", "Acme", gtin,
        new FoodSource(provider, externalId, new DateTimeOffset(2026, 11, 10, 12, 0, 0, TimeSpan.Zero)),
        NutritionBasis.Per100Grams, new NutrientAmounts(250.5m, 10.25m, 30, 10),
        [new FoodServing("1 cup", 60), new FoodServing("1 bar", null), new FoodServing("1 tbsp", 8)]);

    [Fact]
    public async Task GetOrAdd_StoresTheFoodAndReadsItBackUnchanged()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        var food = NewFood(Guid.NewGuid().ToString());

        await WithCatalog(factory, catalog => catalog.GetOrAddAsync(food, Cancel));
        var stored = await WithCatalog(factory, catalog => catalog.FindAsync(food.Id, Cancel));

        Assert.NotNull(stored);
        Assert.Equal(food with { Servings = [] }, stored with { Servings = [] });
        Assert.Equal(food.Servings, stored.Servings);
    }

    [Fact]
    public async Task GetOrAdd_ReturnsTheExistingFoodForTheSameSource()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        var externalId = Guid.NewGuid().ToString();
        var first = NewFood(externalId);

        await WithCatalog(factory, catalog => catalog.GetOrAddAsync(first, Cancel));
        var second = await WithCatalog(factory, catalog => catalog.GetOrAddAsync(NewFood(externalId) with { Name = "Renamed" }, Cancel));

        Assert.Equal(first.Id, second.Id);
        Assert.Equal("Granola", second.Name);
    }

    [Fact]
    public async Task FindByBarcode_MatchesAnyGtinFormAndPrefersLocalFoods()
    {
        await using var factory = new ApiFactory(sql.NewDatabase());
        var usda = NewFood("usda-1");
        var local = NewFood("local-1", provider: FoodSourceProvider.Local);
        await WithCatalog(factory, catalog => catalog.GetOrAddAsync(usda, Cancel));
        await WithCatalog(factory, catalog => catalog.GetOrAddAsync(local, Cancel));

        var byUpc = await WithCatalog(factory, catalog => catalog.FindByBarcodeAsync("036000291452", Cancel));
        var byEan = await WithCatalog(factory, catalog => catalog.FindByBarcodeAsync("0036000291452", Cancel));
        var invalid = await WithCatalog(factory, catalog => catalog.FindByBarcodeAsync("036000291453", Cancel));

        Assert.Equal(local.Id, byUpc?.Id);
        Assert.Equal(local.Id, byEan?.Id);
        Assert.Null(invalid);
    }

    private static async Task<T> WithCatalog<T>(ApiFactory factory, Func<IFoodCatalog, Task<T>> action)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<IFoodCatalog>());
    }
}
