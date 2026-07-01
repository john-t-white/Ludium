using System.Security.Claims;

namespace Ludium.Api.Infrastructure.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        var subject = principal.FindFirstValue("sub");
        return Guid.TryParse(subject, out var userId) ? userId : null;
    }
}
