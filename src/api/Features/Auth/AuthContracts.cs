using Ludium.Api.Features.Users;

namespace Ludium.Api.Features.Auth;

public readonly record struct LoginRequest(string IdToken);

public readonly record struct TestLoginRequest(string GoogleSubjectId, string Name);

public readonly record struct LoginResponse(string Token, UserResponse User);
