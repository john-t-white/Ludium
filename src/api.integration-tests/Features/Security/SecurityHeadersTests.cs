using System.Net;
using FluentAssertions;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ludium.Api.Tests.Features.Security;

public class SecurityHeadersTests(IntegrationTestFactory factory)
    : IClassFixture<IntegrationTestFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task SecurityHeaders_WhenResponseReturned_IncludesContentTypeOptionsNosniff()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Headers.GetValues("X-Content-Type-Options").Should().ContainSingle()
            .Which.Should().Be("nosniff");
    }

    [Fact]
    public async Task SecurityHeaders_WhenResponseReturned_IncludesFrameOptionsDeny()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Headers.GetValues("X-Frame-Options").Should().ContainSingle()
            .Which.Should().Be("DENY");
    }

    [Fact]
    public async Task SecurityHeaders_WhenResponseReturned_IncludesReferrerPolicy()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Headers.GetValues("Referrer-Policy").Should().ContainSingle()
            .Which.Should().Be("strict-origin-when-cross-origin");
    }

    [Fact]
    public async Task SecurityHeaders_WhenResponseReturned_IncludesPermittedCrossDomainPoliciesNone()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Headers.GetValues("X-Permitted-Cross-Domain-Policies").Should().ContainSingle()
            .Which.Should().Be("none");
    }

    [Fact]
    public async Task SecurityHeaders_WhenProductionEnvironment_IncludesStrictTransportSecurity()
    {
        var client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureServices(services =>
                services.Configure<HstsOptions>(options => options.ExcludedHosts.Clear()));
        }).CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/app-info");
        request.Headers.Add("X-Forwarded-Proto", "https");

        var response = await client.SendAsync(request);

        response.Headers.GetValues("Strict-Transport-Security").Should().ContainSingle()
            .Which.Should().Be("max-age=31536000; includeSubDomains");
    }

    [Fact]
    public async Task SecurityHeaders_WhenDevelopmentEnvironment_DoesNotIncludeStrictTransportSecurity()
    {
        var client = factory.WithWebHostBuilder(builder =>
            builder.UseEnvironment("Development")).CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/app-info");
        request.Headers.Add("X-Forwarded-Proto", "https");

        var response = await client.SendAsync(request);

        response.Headers.Contains("Strict-Transport-Security").Should().BeFalse();
    }

    [Fact]
    public async Task SecurityHeaders_WhenProductionEnvironmentOverPlainHttp_DoesNotIncludeStrictTransportSecurity()
    {
        var client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureServices(services =>
                services.Configure<HstsOptions>(options => options.ExcludedHosts.Clear()));
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Contains("Strict-Transport-Security").Should().BeFalse();
    }

    [Fact]
    public async Task SecurityHeaders_WhenResponseReturned_IncludesContentSecurityPolicy()
    {
        var response = await _client.GetAsync("/api/v1/app-info");

        response.Headers.GetValues("Content-Security-Policy").Should().ContainSingle()
            .Which.Should().Be("default-src 'none'; frame-ancestors 'none'");
    }
}
