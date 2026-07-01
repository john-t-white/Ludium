using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace Ludium.Api.Infrastructure.Auth;

public sealed class GoogleTokenValidator(
    IOptions<GoogleAuthOptions> options,
    ILogger<GoogleTokenValidator> logger) : IGoogleTokenValidator
{
    private readonly GoogleAuthOptions _options = options.Value;

    public async Task<GoogleUserInfo?> ValidateAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [_options.ClientId],
        };

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings).ConfigureAwait(false);
            return new GoogleUserInfo(payload.Subject, payload.Name, payload.GivenName, payload.Email);
        }
        catch (InvalidJwtException)
        {
            // Never log the id_token itself — it is a bearer credential.
            logger.LogInformation("Rejected an invalid Google id_token.");
            return null;
        }
    }
}
