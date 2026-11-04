using System.ComponentModel.DataAnnotations;

namespace Dao.Maxxing.Services.Data;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>The connection string name. The AppHost supplies it as <c>ConnectionStrings__maxxing</c>.</summary>
    public const string ConnectionName = "maxxing";

    [Required(ErrorMessage = "Set ConnectionStrings:maxxing to the SQL Server connection string. The AppHost supplies it locally; see docs/database.md.")]
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Applies pending migrations when the host starts, in every environment. EF Core takes a database
    /// lock while migrating, so concurrent instances wait instead of racing. Turn off only if migrations
    /// move to a separate deployment step.
    /// </summary>
    public bool ApplyMigrationsOnStartup { get; set; } = true;
}
