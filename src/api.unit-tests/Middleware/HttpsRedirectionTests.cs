using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
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

    [Fact]
    public async Task HttpRequest_GivenXForwardedProtoHttpsFromUntrustedProxy_RedirectsToHttps()
    {
        // Simulate the request arriving from a non-loopback source. Only loopback is
        // trusted by default, so this untrusted source's X-Forwarded-Proto must be
        // ignored: request.Scheme stays "http" and UseHttpsRedirection still redirects.
        using var factory = CreateFactory(untrustedRemoteIp: IPAddress.Parse("203.0.113.7"));
        var client = factory.CreateClient(NoRedirectOptions());
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var response = await client.GetAsync("/api/v1/app-info");

        response.StatusCode.Should().Be(HttpStatusCode.TemporaryRedirect);
    }

    private static WebApplicationFactoryClientOptions NoRedirectOptions() => new()
    {
        AllowAutoRedirect = false,
        BaseAddress = new Uri("http://localhost")
    };

    private static RedirectionFactory CreateFactory(
        TestLogCollector? logs = null,
        string[]? trustedNetworks = null,
        IPAddress? untrustedRemoteIp = null)
        => new(logs, trustedNetworks ?? [], untrustedRemoteIp);

    private sealed class RedirectionFactory(
        TestLogCollector? logs,
        string[] trustedNetworks,
        IPAddress? untrustedRemoteIp)
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

            if (untrustedRemoteIp is not null)
            {
                // Prepend (via IStartupFilter) a middleware that runs before the app's
                // UseForwardedHeaders, overriding the connection's remote IP so the
                // forwarded-headers middleware sees an untrusted source.
                builder.ConfigureServices(services =>
                    services.AddSingleton<IStartupFilter>(
                        new RemoteIpStartupFilter(untrustedRemoteIp)));
            }

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

    private sealed class RemoteIpStartupFilter(IPAddress remoteIp) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
            => app =>
            {
                app.Use(async (context, nextMiddleware) =>
                {
                    context.Connection.RemoteIpAddress = remoteIp;
                    await nextMiddleware();
                });
                next(app);
            };
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
