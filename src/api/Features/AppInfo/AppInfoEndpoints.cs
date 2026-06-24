using Microsoft.AspNetCore.Mvc;

namespace Ludium.Api.Features.AppInfo;

public static class AppInfoEndpoints
{
    public static IEndpointRouteBuilder MapAppInfoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/app-info", ([FromServices] AppInfoService service) =>
        {
            var result = service.GetAppInfo();
            return Results.Ok(result);
        })
        .Produces<AppInfoResponse>(StatusCodes.Status200OK)
        .WithName("GetAppInfo")
        .WithTags("AppInfo")
        .AllowAnonymous();

        return app;
    }
}
