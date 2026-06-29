using FluentAssertions;
using Ludium.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
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
}
