using Azure.Core;
using Azure.Identity;
using Dao.Maxxing.Services.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Authentication;

public sealed class DataProtectionSettings
{
    public const string SectionName = "DataProtection";

    /// <summary>
    /// The Key Vault key that wraps the stored Data Protection keys, as a versionless key URI
    /// (https://&lt;vault&gt;.vault.azure.net/keys/&lt;name&gt;). Required outside Development and Testing.
    /// </summary>
    public Uri? KeyVaultKeyId { get; set; }
}

internal sealed class DataProtectionSettingsValidator : IValidateOptions<DataProtectionSettings>
{
    public ValidateOptionsResult Validate(string? name, DataProtectionSettings options) =>
        options.KeyVaultKeyId is { IsAbsoluteUri: true, Scheme: "https" }
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(
                "Set DataProtection:KeyVaultKeyId to the Key Vault key URI that wraps the session keys " +
                "(Terraform sets it in Azure). See docs/deployment.md.");
}

public static class DataProtectionSetup
{
    /// <summary>
    /// Session, OAuth correlation, and antiforgery cookies are encrypted with Data Protection keys stored
    /// in the database, so sessions survive restarts and work across instances. Outside Development and
    /// Testing, those stored keys are also wrapped with a Key Vault key, so a database copy alone can't
    /// decrypt them.
    /// </summary>
    public static void AddApiDataProtection(this WebApplicationBuilder builder)
    {
        var dataProtection = builder.Services.AddDataProtection()
            .SetApplicationName("Dao.Maxxing")
            .PersistKeysToDbContext<MaxxingDbContext>();

        if (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing")) return;

        builder.Services.AddSingleton<IValidateOptions<DataProtectionSettings>, DataProtectionSettingsValidator>();
        builder.Services.AddOptions<DataProtectionSettings>()
            .Bind(builder.Configuration.GetSection(DataProtectionSettings.SectionName))
            .ValidateOnStart();
        // In Azure this is the app's managed identity (AZURE_CLIENT_ID). Tests replace it.
        builder.Services.TryAddSingleton<TokenCredential>(_ => new DefaultAzureCredential());

        dataProtection.ProtectKeysWithAzureKeyVault(
            sp => sp.GetRequiredService<IOptions<DataProtectionSettings>>().Value.KeyVaultKeyId!,
            sp => sp.GetRequiredService<TokenCredential>());
    }
}
