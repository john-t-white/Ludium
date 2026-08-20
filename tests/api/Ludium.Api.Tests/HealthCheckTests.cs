using System.Net;

namespace Ludium.Api.Tests;

public class HealthCheckTests : IClassFixture<TestApiFactory>
{
    private readonly TestApiFactory _factory;

    public HealthCheckTests(TestApiFactory factory) => _factory = factory;

    [Fact]
    public async Task LivenessEndpoint_ReportsHealthy()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/live", cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(cancellationToken));
    }
}
