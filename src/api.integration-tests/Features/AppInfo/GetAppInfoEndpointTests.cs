using System.Net;
using System.Text.Json;
using FluentAssertions;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Ludium.Api.Tests.Features.AppInfo;

public class GetAppInfoEndpointTests(IntegrationTestFactory factory)
    : IClassFixture<IntegrationTestFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetAppInfo_WhenCalled_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAppInfo_WhenAppNameConfigured_ReturnsExactName()
    {
        var client = factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?> { ["App:Name"] = "TestApp" })
            )).CreateClient();

        var response = await client.GetAsync("/api/v1/app-info");
        var json = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(json);
        var appName = doc.RootElement.GetProperty("appName").GetString();

        appName.Should().Be("TestApp");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetAppInfo_WhenAppNameIsNullOrWhitespace_ReturnsFallback(string? configuredName)
    {
        var client = factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?> { ["App:Name"] = configuredName })
            )).CreateClient();

        var response = await client.GetAsync("/api/v1/app-info");
        var json = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(json);
        var appName = doc.RootElement.GetProperty("appName").GetString();

        appName.Should().Be("Ludium");
    }

    [Fact]
    public async Task GetAppInfo_WhenCalled_ReturnsJsonContentType()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task GetAppInfo_DoesNotRequireAuthentication()
    {
        // No Authorization header set on the client — assert 200, not 401
        var response = await _client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
