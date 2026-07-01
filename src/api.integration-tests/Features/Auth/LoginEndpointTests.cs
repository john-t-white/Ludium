using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Ludium.Api.Data;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ludium.Api.Tests.Features.Auth;

public class LoginEndpointTests(IntegrationTestFactory factory) : IClassFixture<IntegrationTestFactory>
{
    private static string NewSubject() => $"sub-{Guid.NewGuid():N}";

    [Fact]
    public async Task Login_WhenFirstTimeGoogleUser_CreatesUserAndReturnsJwt()
    {
        var subject = NewSubject();
        var app = factory.WithGoogleUser(subject, "Ada Tester");
        var client = app.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "google-token" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>();
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.User.Name.Should().Be("Ada Tester");
        body.User.Id.Should().NotBeEmpty();
        (await CountUsersAsync(app, subject)).Should().Be(1);
    }

    [Fact]
    public async Task Login_WhenReturningGoogleUser_ReturnsSameUserNoDuplicate()
    {
        var subject = NewSubject();
        var app = factory.WithGoogleUser(subject, "Ada Tester");
        var client = app.CreateClient();

        var first = await (await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "t1" }))
            .Content.ReadFromJsonAsync<LoginResponseDto>();
        var second = await (await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "t2" }))
            .Content.ReadFromJsonAsync<LoginResponseDto>();

        second!.User.Id.Should().Be(first!.User.Id);
        (await CountUsersAsync(app, subject)).Should().Be(1);
    }

    [Theory]
    [InlineData("invalid-token")]
    [InlineData("expired-token")]
    public async Task Login_WhenGoogleTokenRejected_Returns401(string idToken)
    {
        var client = factory.WithRejectedGoogleToken().CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Login_WhenBodyMissingToken_Returns400(string idToken)
    {
        var client = factory.WithGoogleUser(NewSubject(), "Ada Tester").CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WhenConcurrentFirstLoginsForSameSub_CreatesExactlyOneUser()
    {
        var subject = NewSubject();
        var app = factory.WithGoogleUser(subject, "Ada Tester");
        var client = app.CreateClient();

        var responses = await Task.WhenAll(
            client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "a" }),
            client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "b" }));

        responses.Should().OnlyContain(r => r.StatusCode == HttpStatusCode.OK);
        var bodies = await Task.WhenAll(responses.Select(r => r.Content.ReadFromJsonAsync<LoginResponseDto>()));
        bodies.Select(b => b!.User.Id).Distinct().Should().ContainSingle();
        (await CountUsersAsync(app, subject)).Should().Be(1);
    }

    [Fact]
    public async Task Login_WhenRequestsExceedRateLimit_Returns429()
    {
        // Fires well past the configured per-window permit limit for the auth policy; the limiter
        // must permit the first request and reject at least one once the window fills.
        var client = factory.WithGoogleUser(NewSubject(), "Ada Tester").CreateClient();

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 15; i++)
        {
            var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = $"t{i}" });
            statuses.Add(response.StatusCode);
        }

        statuses[0].Should().Be(HttpStatusCode.OK);
        statuses.Should().Contain(HttpStatusCode.TooManyRequests);
    }

    private static async Task<int> CountUsersAsync(Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> app, string subject)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await dbContext.Users.CountAsync(u => u.GoogleSubjectId == subject);
    }

    private sealed record LoginResponseDto(string Token, UserDto User);

    private sealed record UserDto(Guid Id, string Name);
}
