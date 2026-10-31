using System.Net;

namespace Dao.Maxxing.Api.Tests;

public class OpenApiTests(SqlServerFixture sql)
{
    [Theory]
    [InlineData("/openapi/v1.json")]
    [InlineData("/scalar")]
    public async Task ApiReference_InDevelopment_IsServedAnonymously(string path)
    {
        await using var factory = new ApiFactory(sql.ConnectionString) { Environment = "Development" };

        var response = await factory.CreateClient().GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("/openapi/v1.json")]
    [InlineData("/scalar")]
    public async Task ApiReference_OutsideDevelopment_IsNotServed(string path)
    {
        await using var factory = new ApiFactory(sql.ConnectionString);

        var response = await factory.CreateClient().GetAsync(path, TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        // The SPA fallback may answer with index.html, but never with the document or the reference.
        Assert.DoesNotContain("\"openapi\"", body);
        Assert.DoesNotContain("scalar", body, StringComparison.OrdinalIgnoreCase);
    }
}
