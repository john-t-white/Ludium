using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Ludium.Api.Data;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ludium.Api.Tests.Features.Auth;

public class TestLoginEndpointTests(IntegrationTestFactory factory) : IClassFixture<IntegrationTestFactory>
{
    private static string NewSubject() => $"sub-{Guid.NewGuid():N}";

    [Fact]
    public async Task TestLogin_WhenReturningUser_ReturnsSameUserNoDuplicate()
    {
        var subject = NewSubject();
        var app = factory.WithTestLoginEnabled();
        var client = app.CreateClient();
        var request = new { googleSubjectId = subject, name = "Ada Tester" };

        var first = await (await client.PostAsJsonAsync("/api/v1/auth/test-login", request))
            .Content.ReadFromJsonAsync<LoginResponseDto>();
        var second = await (await client.PostAsJsonAsync("/api/v1/auth/test-login", request))
            .Content.ReadFromJsonAsync<LoginResponseDto>();

        second!.User.Id.Should().Be(first!.User.Id);
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await dbContext.Users.CountAsync(u => u.GoogleSubjectId == subject)).Should().Be(1);
    }

    [Fact]
    public async Task TestLogin_WhenFlagDisabled_Returns404()
    {
        // The base factory leaves Auth:EnableTestLogin at its appsettings default (false).
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/test-login", new { googleSubjectId = NewSubject(), name = "Ada Tester" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TestLogin_WhenProductionEnvironment_Returns404()
    {
        // Flag ENABLED but Production — the route must still never be registered.
        var client = factory.WithProductionEnvironment().WithTestLoginEnabled().CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/test-login", new { googleSubjectId = NewSubject(), name = "Ada Tester" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed record LoginResponseDto(string Token, UserDto User);

    private sealed record UserDto(Guid Id, string Name);
}
