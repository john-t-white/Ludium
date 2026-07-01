using Ludium.Api.Features.Users;

namespace Ludium.Api.Infrastructure.Auth;

public interface IJwtIssuer
{
    string Issue(User user);
}
