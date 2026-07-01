using FluentAssertions;
using Ludium.Api.Features.Users;
using Ludium.Api.Infrastructure.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Xunit;

namespace Ludium.Api.UnitTests.Infrastructure.Auth;

public class JwtIssuerTests
{
    private const string SigningKey = "unit-test-signing-key-that-is-long-enough-1234567890";

    [Fact]
    public void Issue_GivenUser_EmitsExpectedClaims()
    {
        var user = User.CreateFromGoogle("google-sub-1", "Ada Lovelace");
        var issuer = CreateIssuer(accessTokenMinutes: 60);

        var token = issuer.Issue(user);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        jwt.GetClaim("sub").Value.Should().Be(user.Id.ToString());
        jwt.GetClaim("name").Value.Should().Be("Ada Lovelace");
        jwt.Issuer.Should().Be("https://test.ludium");
        jwt.Audiences.Should().Contain("ludium-api");
    }

    [Fact]
    public void Issue_GivenSixtyMinuteLifetime_SetsExpiryRoughlyOneHourAhead()
    {
        var issuer = CreateIssuer(accessTokenMinutes: 60);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(issuer.Issue(User.CreateFromGoogle("s", "n")));

        (jwt.ValidTo - jwt.IssuedAt).Should().BeCloseTo(TimeSpan.FromMinutes(60), TimeSpan.FromSeconds(5));
        jwt.ValidTo.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void Issue_GivenNegativeLifetime_ProducesAlreadyExpiredToken()
    {
        var issuer = CreateIssuer(accessTokenMinutes: -5);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(issuer.Issue(User.CreateFromGoogle("s", "n")));

        jwt.ValidTo.Should().BeBefore(DateTime.UtcNow);
    }

    private static JwtIssuer CreateIssuer(int accessTokenMinutes)
        => new(Options.Create(new JwtOptions
        {
            Issuer = "https://test.ludium",
            Audience = "ludium-api",
            AccessTokenMinutes = accessTokenMinutes,
            SigningKey = SigningKey,
        }));
}
