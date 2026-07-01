using System.Text;
using Ludium.Api.Features.Users;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Ludium.Api.Infrastructure.Auth;

public sealed class JwtIssuer(IOptions<JwtOptions> options) : IJwtIssuer
{
    private readonly JwtOptions _options = options.Value;

    public string Issue(User user)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var now = DateTime.UtcNow;

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now,
            Expires = now.AddMinutes(_options.AccessTokenMinutes),
            Claims = new Dictionary<string, object>
            {
                ["sub"] = user.Id.ToString(),
                ["name"] = user.Name,
            },
            SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
