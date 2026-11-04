using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Authentication;

public sealed class AuthenticationSettings
{
    public const string SectionName = "Authentication";

    public string? PublicOrigin { get; set; }
    public GoogleSettings Google { get; set; } = new();
    public OwnerSettings Owner { get; set; } = new();

    /// <summary>The validated public origin as scheme://host[:port], with no trailing slash.</summary>
    public string PublicOriginAuthority => new Uri(PublicOrigin!).GetLeftPart(UriPartial.Authority);

    public sealed class GoogleSettings
    {
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
    }

    /// <summary>The one account allowed to use the app.</summary>
    public sealed class OwnerSettings
    {
        /// <summary>
        /// The owner's Google subject ID (the ID token's <c>sub</c> claim). It never changes for an
        /// account, unlike the email address, which can be renamed or reassigned.
        /// </summary>
        public string? GoogleSubject { get; set; }
    }
}

internal sealed class AuthenticationSettingsValidator : IValidateOptions<AuthenticationSettings>
{
    public ValidateOptionsResult Validate(string? name, AuthenticationSettings options)
    {
        var failures = new List<string>();
        if (!Uri.TryCreate(options.PublicOrigin, UriKind.Absolute, out var uri) ||
            uri.Scheme != "https" || uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment) || !string.IsNullOrEmpty(uri.UserInfo))
        {
            failures.Add("Set Authentication:PublicOrigin to the public HTTPS origin (without a path). See docs/authentication.md.");
        }
        if (string.IsNullOrWhiteSpace(options.Google.ClientId) || string.IsNullOrWhiteSpace(options.Google.ClientSecret))
        {
            failures.Add("Set Authentication:Google:ClientId and ClientSecret using user secrets or deployment secrets. See docs/authentication.md.");
        }
        if (string.IsNullOrWhiteSpace(options.Owner.GoogleSubject))
        {
            failures.Add("Set Authentication:Owner:GoogleSubject to the owner's Google subject ID using user secrets or deployment secrets. See docs/authentication.md.");
        }
        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }
}
