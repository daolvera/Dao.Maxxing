using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Dao.Maxxing.Api.Authentication;

/// <summary>Decides whether a signed-in principal is the app's single owner.</summary>
public sealed class OwnerAccount(IOptions<AuthenticationSettings> settings)
{
    /// <summary>The Google handler maps the ID token's <c>sub</c> claim to <see cref="ClaimTypes.NameIdentifier"/>.</summary>
    public static string? SubjectOf(ClaimsPrincipal? principal) => principal?.FindFirstValue(ClaimTypes.NameIdentifier);

    public bool IsOwner(ClaimsPrincipal? principal) =>
        SubjectOf(principal) is { } subject &&
        string.Equals(subject, settings.Value.Owner.GoogleSubject, StringComparison.Ordinal);
}

/// <summary>
/// Part of the <c>api</c> policy. Sign-in already refuses other accounts; this also rejects a session
/// that outlived a change of owner.
/// </summary>
public sealed class OwnerRequirement : IAuthorizationRequirement;

internal sealed class OwnerAuthorizationHandler(OwnerAccount owner) : AuthorizationHandler<OwnerRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, OwnerRequirement requirement)
    {
        if (owner.IsOwner(context.User)) context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
