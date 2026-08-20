using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ludium.Api.Tests;

// Hosts the API under its own environment name. Left to itself the factory
// boots as Development against the real src/api content root, which would pull
// in appsettings.Development.json and user secrets once those exist — the
// database settings arriving with the schema work would then reach test runs
// on their own. Pinning a name no config file is written for keeps the suite
// dependent on nothing but the code under test.
public class TestApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseEnvironment("Testing");
}
