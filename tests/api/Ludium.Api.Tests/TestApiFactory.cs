using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Ludium.Api.Tests;

// Hosts the API on the committed configuration baseline and nothing else.
//
// Left to itself the factory boots as Development against the real src/api
// content root, so appsettings.Development.json, user secrets, and ambient
// environment variables all reach the app under test. The database settings
// arriving with the schema work would then feed test runs on their own.
//
// Clearing the sources removes all of that. appsettings.json goes back
// because it is checked in and identical for everyone, so it carries none of
// the machine-dependence the rest did — and without it the app under test
// would fall back to framework defaults rather than the settings the service
// actually ships with, quietly passing tests that production would fail.
public class TestApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.Sources.Clear();
            config.AddJsonFile("appsettings.json", optional: false);
        });
    }
}
