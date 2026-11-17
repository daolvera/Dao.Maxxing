using Dao.Maxxing.Core.Foods;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dao.Maxxing.Services.Foods;

/// <summary>The stored shape of a <see cref="Food"/>. Shared catalog data, not personal data.</summary>
internal sealed class FoodRecord
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Brand { get; set; }
    public string? Gtin { get; set; }
    public FoodSourceProvider Provider { get; set; }
    public required string ExternalId { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public NutritionBasis Basis { get; set; }
    public decimal Calories { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }
    public List<FoodServingRecord> Servings { get; set; } = [];

    public static FoodRecord From(Food food) => new()
    {
        Id = food.Id,
        Name = food.Name,
        Brand = food.Brand,
        Gtin = food.Gtin,
        Provider = food.Source.Provider,
        ExternalId = food.Source.ExternalId,
        RetrievedAt = food.Source.RetrievedAt,
        Basis = food.Basis,
        Calories = food.Nutrients.Calories,
        ProteinGrams = food.Nutrients.ProteinGrams,
        CarbohydrateGrams = food.Nutrients.CarbohydrateGrams,
        FatGrams = food.Nutrients.FatGrams,
        Servings = food.Servings.Select((s, i) => new FoodServingRecord { Position = i, Label = s.Label, Grams = s.Grams }).ToList(),
    };

    public Food ToFood() => new(
        Id,
        Name,
        Brand,
        Gtin,
        new FoodSource(Provider, ExternalId, RetrievedAt),
        Basis,
        new NutrientAmounts(Calories, ProteinGrams, CarbohydrateGrams, FatGrams),
        Servings.OrderBy(s => s.Position).Select(s => new FoodServing(s.Label, s.Grams)).ToList());
}

internal sealed class FoodServingRecord
{
    public int Position { get; set; }
    public required string Label { get; set; }
    public decimal? Grams { get; set; }
}

internal sealed class FoodRecordConfiguration : IEntityTypeConfiguration<FoodRecord>
{
    public void Configure(EntityTypeBuilder<FoodRecord> food)
    {
        food.ToTable("Foods");
        food.HasKey(f => f.Id);
        food.Property(f => f.Id).ValueGeneratedNever();
        food.Property(f => f.Name).HasMaxLength(200);
        food.Property(f => f.Brand).HasMaxLength(200);
        food.Property(f => f.Gtin).HasMaxLength(14).IsFixedLength().IsUnicode(false);
        food.Property(f => f.ExternalId).HasMaxLength(100);
        food.Property(f => f.Calories).HasPrecision(9, 1);
        food.Property(f => f.ProteinGrams).HasPrecision(9, 2);
        food.Property(f => f.CarbohydrateGrams).HasPrecision(9, 2);
        food.Property(f => f.FatGrams).HasPrecision(9, 2);

        // One row per source food: the stable identity.
        food.HasIndex(f => new { f.Provider, f.ExternalId }).IsUnique();
        // Not unique: two sources can know the same product.
        food.HasIndex(f => f.Gtin);

        food.OwnsMany(f => f.Servings, serving =>
        {
            serving.ToTable("FoodServings");
            serving.WithOwner().HasForeignKey("FoodId");
            serving.HasKey("FoodId", nameof(FoodServingRecord.Position));
            serving.Property(s => s.Position).ValueGeneratedNever();
            serving.Property(s => s.Label).HasMaxLength(100);
            serving.Property(s => s.Grams).HasPrecision(9, 2);
        });
    }
}
