using System.Text.RegularExpressions;

namespace Dao.Maxxing.Api.Tests;

/// <summary>
/// Conventions from AGENTS.md that BannedSymbols.txt cannot express. The banned-API analyzer
/// does not see indexer access, so <c>configuration["Key"]</c> is caught here instead.
/// </summary>
public partial class ConventionTests
{
    private static readonly string[] AppProjects = ["Dao.Maxxing.Api", "Dao.Maxxing.Services", "Dao.Maxxing.Core"];

    [Fact]
    public void AppCode_DoesNotReadConfigurationKeysDirectly()
    {
        var root = FindRepositoryRoot();
        var violations = AppProjects
            .SelectMany(project => Directory.EnumerateFiles(Path.Combine(root, project), "*.cs", SearchOption.AllDirectories))
            .Where(path => !path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}") &&
                           !path.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
            .SelectMany(path => File.ReadLines(path).Select((line, index) => (path, line, number: index + 1)))
            .Where(x => ConfigurationIndexer().IsMatch(x.line))
            .Select(x => $"{Path.GetRelativePath(root, x.path)}:{x.number}: {x.line.Trim()}")
            .ToList();

        Assert.True(violations.Count == 0,
            "Bind a validated IOptions class instead of reading configuration keys (AGENTS.md: Configuration):\n" +
            string.Join('\n', violations));
    }

    private static string FindRepositoryRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "Dao.Maxxing.slnx"))) return dir.FullName;
        }
        throw new InvalidOperationException("Could not find Dao.Maxxing.slnx above the test output directory.");
    }

    [GeneratedRegex(@"[Cc]onfiguration\s*\[\s*""")]
    private static partial Regex ConfigurationIndexer();
}
