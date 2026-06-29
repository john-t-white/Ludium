using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Ludium.Api.UnitTests.Middleware;

public class HttpsRedirectionTests : IClassFixture<HttpsRedirectionTests.RedirectionFactory>
{
    private readonly RedirectionFactory _factory;

    public HttpsRedirectionTests(RedirectionFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HttpRequest_GivenHttpScheme_RedirectsToHttps()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("http://localhost")
        });

        var response = await client.GetAsync("/");

        response.StatusCode.Should().Be(HttpStatusCode.TemporaryRedirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.Scheme.Should().Be("https");
        response.Headers.Location!.Port.Should().Be(443);
    }

    [Fact]
    public async Task HttpRequest_GivenXForwardedProtoHttps_DoesNotRedirect()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("http://localhost")
        });
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var response = await client.GetAsync("/api/v1/app-info");

        ((int)response.StatusCode).Should().NotBeInRange(300, 399);
    }

    public class RedirectionFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    // Redirect short-circuits before any endpoint, so the DB is never opened.
                    ["ConnectionStrings:DefaultConnection"] =
                        "Host=localhost;Database=unit;Username=u;Password=p",
                    // Deterministic target port so UseHttpsRedirection emits a redirect
                    // instead of no-opping on an undetermined HTTPS port.
                    ["https_port"] = "443"
                });
            });
        }
    }
}
