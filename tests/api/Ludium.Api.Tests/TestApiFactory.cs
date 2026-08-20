using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Ludium.Api.Tests;

// Hosts the API with configuration the test owns outright.
//
// Left to itself the factory boots as Development against the real src/api
// content root, so appsettings.Development.json, user secrets, and ambient
// environment variables all reach the app under test. The database settings
// arriving with the schema work would then feed test runs on their own.
//
// Pinning an environment nothing writes a config file for handles the files;
// clearing the sources handles the rest, so a test's configuration is an
// explicit input rather than whatever the machine happens to hold. Anything a
// test needs gets added back here deliberately.
public class TestApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.Sources.Clear());
    }
}
