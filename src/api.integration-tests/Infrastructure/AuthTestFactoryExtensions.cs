using Ludium.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ludium.Api.Tests.Infrastructure;

public static class AuthTestFactoryExtensions
{
    /// <summary>Makes the Google validator accept any token and return the given user.</summary>
    public static WebApplicationFactory<Program> WithGoogleUser(
        this WebApplicationFactory<Program> factory, string subject, string name)
        => factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator>(
                new StubGoogleTokenValidator(new GoogleUserInfo(subject, name, null, null)));
        }));

    /// <summary>Makes the Google validator reject any token (invalid/expired).</summary>
    public static WebApplicationFactory<Program> WithRejectedGoogleToken(
        this WebApplicationFactory<Program> factory)
        => factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator>(new StubGoogleTokenValidator(null));
        }));

    public static WebApplicationFactory<Program> WithTestLoginEnabled(
        this WebApplicationFactory<Program> factory)
        => factory.WithConfig(new() { ["Auth:EnableTestLogin"] = "true" });

    public static WebApplicationFactory<Program> WithProductionEnvironment(
        this WebApplicationFactory<Program> factory)
        => factory.WithWebHostBuilder(builder => builder.UseEnvironment("Production"));

    /// <summary>Mints already-expired access tokens so JWT lifetime validation can be exercised.</summary>
    public static WebApplicationFactory<Program> WithExpiredAccessTokens(
        this WebApplicationFactory<Program> factory)
        => factory.WithConfig(new() { ["Jwt:AccessTokenMinutes"] = "-5" });

    private static WebApplicationFactory<Program> WithConfig(
        this WebApplicationFactory<Program> factory, Dictionary<string, string?> values)
        => factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(values)));
}
