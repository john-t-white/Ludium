using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Ludium.Api.UnitTests.Middleware;

public class HttpsRedirectionTests
{
    [Fact]
    public async Task HttpRequest_GivenHttpScheme_RedirectsToHttps()
    {
        using var factory = CreateFactory();
        var client = factory.CreateClient(NoRedirectOptions());

        var response = await client.GetAsync("/");

        response.StatusCode.Should().Be(HttpStatusCode.TemporaryRedirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.Scheme.Should().Be("https");
        response.Headers.Location!.Port.Should().Be(443);
    }

    [Fact]
    public async Task HttpRequest_GivenXForwardedProtoHttps_DoesNotRedirect()
    {
        using var factory = CreateFactory();
        var client = factory.CreateClient(NoRedirectOptions());
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var response = await client.GetAsync("/api/v1/app-info");

        ((int)response.StatusCode).Should().NotBeInRange(300, 399);
    }

    [Fact]
    public async Task Startup_GivenValidTrustedNetworkCidr_AddsTrustWithoutWarning()
    {
        var logs = new TestLogCollector();
        using var factory = CreateFactory(logs, trustedNetworks: ["10.0.0.0/8"]);
        var client = factory.CreateClient(NoRedirectOptions());
        // Loopback is trusted by default, so the forwarded scheme passes through
        // to the endpoint — proving startup parsed the CIDR and the app serves.
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var response = await client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        logs.Warnings.Should().NotContain(w => w.Contains("10.0.0.0/8"));
    }

    [Fact]
    public async Task Startup_GivenInvalidTrustedNetworkCidr_LogsWarningSkipsEntryAndStillServes()
    {
        var logs = new TestLogCollector();
        using var factory = CreateFactory(logs, trustedNetworks: ["not-a-cidr"]);
        var client = factory.CreateClient(NoRedirectOptions());
        // A malformed entry must not crash startup — loopback default still trusts
        // the forwarded scheme, so the request reaches the endpoint.
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var response = await client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        logs.Warnings.Should().Contain(w =>
            w.Contains("not-a-cidr") && w.Contains("not a valid CIDR"));
    }

    private static WebApplicationFactoryClientOptions NoRedirectOptions() => new()
    {
        AllowAutoRedirect = false,
        BaseAddress = new Uri("http://localhost")
    };

    private static RedirectionFactory CreateFactory(
        TestLogCollector? logs = null,
        string[]? trustedNetworks = null)
        => new(logs, trustedNetworks ?? []);

    private sealed class RedirectionFactory(TestLogCollector? logs, string[] trustedNetworks)
        : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            var config = new Dictionary<string, string?>
            {
                // Redirect short-circuits before any endpoint, so the DB is never opened.
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=localhost;Database=unit;Username=u;Password=p",
                // Deterministic target port so UseHttpsRedirection emits a redirect
                // instead of no-opping on an undetermined HTTPS port.
                ["https_port"] = "443"
            };
            for (var i = 0; i < trustedNetworks.Length; i++)
            {
                config[$"ForwardedHeaders:TrustedNetworks:{i}"] = trustedNetworks[i];
            }

            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(config));

            if (logs is not null)
            {
                builder.ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddProvider(new TestLoggerProvider(logs));
                    logging.SetMinimumLevel(LogLevel.Warning);
                });
            }
        }
    }

    private sealed class TestLogCollector
    {
        private readonly List<string> _warnings = [];
        private readonly object _gate = new();

        public IReadOnlyList<string> Warnings
        {
            get { lock (_gate) { return _warnings.ToArray(); } }
        }

        public void AddWarning(string message)
        {
            lock (_gate) { _warnings.Add(message); }
        }
    }

    private sealed class TestLoggerProvider(TestLogCollector collector) : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName) => new TestLogger(collector);
        public void Dispose() { }
    }

    private sealed class TestLogger(TestLogCollector collector) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Warning;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (logLevel >= LogLevel.Warning)
                collector.AddWarning(formatter(state, exception));
        }
    }
}
