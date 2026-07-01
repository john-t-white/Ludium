using System.Security.Claims;
using Ludium.Api.Data;
using Ludium.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ludium.Api.Features.Users;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/users/me", async (
            ClaimsPrincipal principal,
            [FromServices] AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = principal.GetUserId();
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == userId.Value)
                .Select(u => (UserResponse?)new UserResponse(u.Id, u.Name))
                .FirstOrDefaultAsync(cancellationToken);

            // A valid JWT whose user row no longer exists is treated as unauthenticated.
            return user is null ? Results.Unauthorized() : Results.Ok(user.Value);
        })
        .Produces<UserResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .WithName("GetCurrentUser")
        .WithTags("Users")
        .RequireAuthorization();

        return app;
    }
}
