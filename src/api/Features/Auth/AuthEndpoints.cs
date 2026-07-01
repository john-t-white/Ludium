using FluentValidation;

namespace Ludium.Api.Features.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder app,
        IHostEnvironment environment,
        IConfiguration configuration)
    {
        app.MapPost("/api/v1/auth/login", async (
            LoginRequest request,
            IValidator<LoginRequest> validator,
            AuthService authService,
            CancellationToken cancellationToken) =>
        {
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToDictionary());
            }

            var result = await authService.LoginAsync(request.IdToken, cancellationToken);
            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Unauthorized();
        })
        .AllowAnonymous()
        .Produces<LoginResponse>(StatusCodes.Status200OK)
        .ProducesValidationProblem()
        .Produces(StatusCodes.Status401Unauthorized)
        .WithName("Login")
        .WithTags("Auth")
        .RequireRateLimiting("auth");

        // SECURITY: Never set Auth:EnableTestLogin=true in any deployed environment
        // (PR/staging/production). This route mints application JWTs for arbitrary users
        // WITHOUT any Google verification and exists solely for automated tests. The
        // !IsProduction() check below is a structural backstop so the route can never be
        // registered in production even if the flag is misconfigured — the flag must stay
        // false everywhere outside the local test host.
        if (!environment.IsProduction() && configuration.GetValue<bool>("Auth:EnableTestLogin"))
        {
            app.MapPost("/api/v1/auth/test-login", async (
                TestLoginRequest request,
                IValidator<TestLoginRequest> validator,
                AuthService authService,
                CancellationToken cancellationToken) =>
            {
                var validation = await validator.ValidateAsync(request, cancellationToken);
                if (!validation.IsValid)
                {
                    return Results.ValidationProblem(validation.ToDictionary());
                }

                var response = await authService.TestLoginAsync(
                    request.GoogleSubjectId,
                    request.Name,
                    cancellationToken);
                return Results.Ok(response);
            })
            .AllowAnonymous()
            .Produces<LoginResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .WithName("TestLogin")
            .WithTags("Auth")
            .RequireRateLimiting("auth");
        }

        return app;
    }
}
