namespace Ludium.Api.Infrastructure.Auth;

public readonly record struct GoogleUserInfo(string Subject, string? Name, string? GivenName, string? Email);

public interface IGoogleTokenValidator
{
    Task<GoogleUserInfo?> ValidateAsync(string idToken);
}
