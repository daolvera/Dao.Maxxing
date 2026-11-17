using System.Net;
using Azure.Core;
using Azure.Identity;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Tests;

/// <summary>Outside Development and Testing, the stored Data Protection keys are wrapped with Key Vault.</summary>
public class DataProtectionTests(SqlServerFixture sql)
{
    [Fact]
    public async Task Production_WithoutKeyVaultKey_FailsWithActionableMessage()
    {
        await using var factory = new ApiFactory(sql.ConnectionString) { Environment = "Production" };

        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("DataProtection:KeyVaultKeyId", error.ToString());
    }

    [Fact]
    public async Task Production_WithKeyVaultKey_WrapsKeysAndStillStarts()
    {
        await using var factory = new ApiFactory(sql.NewDatabase())
        {
            Environment = "Production",
            // Fails at once instead of reaching Azure, so a key that needs wrapping can't be created.
            ConfigureServices = services => services.AddSingleton<TokenCredential>(new UnavailableCredential()),
        };
        factory.Settings["DataProtection:KeyVaultKeyId"] = "https://example.vault.azure.net/keys/data-protection";

        var health = await factory.CreateClient().GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, health.StatusCode);
        var encryptor = factory.Services.GetRequiredService<IOptions<KeyManagementOptions>>().Value.XmlEncryptor;
        Assert.Contains("KeyVault", encryptor?.GetType().Name);
    }

    [Fact]
    public async Task Testing_DoesNotUseKeyVault()
    {
        await using var factory = new ApiFactory(sql.ConnectionString);
        factory.CreateClient();

        Assert.Null(factory.Services.GetRequiredService<IOptions<KeyManagementOptions>>().Value.XmlEncryptor);
    }

    private sealed class UnavailableCredential : TokenCredential
    {
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
            throw new CredentialUnavailableException("No credential in tests.");

        public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
            throw new CredentialUnavailableException("No credential in tests.");
    }
}
