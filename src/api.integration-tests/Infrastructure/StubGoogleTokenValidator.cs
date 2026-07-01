using Ludium.Api.Infrastructure.Auth;

namespace Ludium.Api.Tests.Infrastructure;

/// <summary>
/// Deterministic stand-in for the real Google token validator so login tests never call Google.
/// A non-null result simulates a validated token; null simulates any rejection (invalid, expired,
/// wrong audience) — the real validator collapses all failure modes to null.
/// </summary>
public sealed class StubGoogleTokenValidator(GoogleUserInfo? result) : IGoogleTokenValidator
{
    public Task<GoogleUserInfo?> ValidateAsync(string idToken) => Task.FromResult(result);
}
