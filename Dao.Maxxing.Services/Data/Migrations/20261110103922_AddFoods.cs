using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dao.Maxxing.Services.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFoods : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Foods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Brand = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Gtin = table.Column<string>(type: "char(14)", unicode: false, fixedLength: true, maxLength: 14, nullable: true),
                    Provider = table.Column<int>(type: "int", nullable: false),
                    ExternalId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Basis = table.Column<int>(type: "int", nullable: false),
                    Calories = table.Column<decimal>(type: "decimal(9,1)", precision: 9, scale: 1, nullable: false),
                    ProteinGrams = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    CarbohydrateGrams = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    FatGrams = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Foods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FoodServings",
                columns: table => new
                {
                    Position = table.Column<int>(type: "int", nullable: false),
                    FoodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Grams = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodServings", x => new { x.FoodId, x.Position });
                    table.ForeignKey(
                        name: "FK_FoodServings_Foods_FoodId",
                        column: x => x.FoodId,
                        principalTable: "Foods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Foods_Gtin",
                table: "Foods",
                column: "Gtin");

            migrationBuilder.CreateIndex(
                name: "IX_Foods_Provider_ExternalId",
                table: "Foods",
                columns: new[] { "Provider", "ExternalId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FoodServings");

            migrationBuilder.DropTable(
                name: "Foods");
        }
    }
}
