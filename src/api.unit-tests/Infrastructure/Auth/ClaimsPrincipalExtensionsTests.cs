using System.Security.Claims;
using FluentAssertions;
using Ludium.Api.Infrastructure.Auth;
using Xunit;

namespace Ludium.Api.UnitTests.Infrastructure.Auth;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetUserId_GivenValidSubClaim_ReturnsGuid()
    {
        var id = Guid.CreateVersion7();
        var principal = PrincipalWith(new Claim("sub", id.ToString()));

        principal.GetUserId().Should().Be(id);
    }

    [Fact]
    public void GetUserId_GivenNoSubClaim_ReturnsNull()
    {
        var principal = PrincipalWith(new Claim("name", "Ada"));

        principal.GetUserId().Should().BeNull();
    }

    [Fact]
    public void GetUserId_GivenMalformedSubClaim_ReturnsNull()
    {
        var principal = PrincipalWith(new Claim("sub", "not-a-guid"));

        principal.GetUserId().Should().BeNull();
    }

    private static ClaimsPrincipal PrincipalWith(params Claim[] claims)
        => new(new ClaimsIdentity(claims, "Test"));
}
