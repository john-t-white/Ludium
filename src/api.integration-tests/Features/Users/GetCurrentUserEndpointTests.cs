using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Ludium.Api.Data;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ludium.Api.Tests.Features.Users;

public class GetCurrentUserEndpointTests(IntegrationTestFactory factory) : IClassFixture<IntegrationTestFactory>
{
    private static string NewSubject() => $"sub-{Guid.NewGuid():N}";

    [Fact]
    public async Task GetMe_WhenAuthenticated_ReturnsCurrentUser()
    {
        var app = factory.WithGoogleUser(NewSubject(), "Ada Tester");
        var client = app.CreateClient();
        var login = await LoginAsync(client);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<UserDto>();
        body!.Id.Should().Be(login.User.Id);
        body.Name.Should().Be("Ada Tester");
    }

    [Fact]
    public async Task GetMe_WhenUnauthenticated_Returns401()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_WhenBearerTokenMalformed_Returns401()
    {
        var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-real-jwt");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_WhenAppJwtExpired_Returns401()
    {
        var client = factory.WithGoogleUser(NewSubject(), "Ada Tester").WithExpiredAccessTokens().CreateClient();
        var login = await LoginAsync(client);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_WhenUserRecordDeleted_Returns401()
    {
        var app = factory.WithGoogleUser(NewSubject(), "Ada Tester");
        var client = app.CreateClient();
        var login = await LoginAsync(client);

        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await dbContext.Users.Where(u => u.Id == login.User.Id).ExecuteDeleteAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<LoginResponseDto> LoginAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { idToken = "google-token" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponseDto>())!;
    }

    private sealed record LoginResponseDto(string Token, UserDto User);

    private sealed record UserDto(Guid Id, string Name);
}
