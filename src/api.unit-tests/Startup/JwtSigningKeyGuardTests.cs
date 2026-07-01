using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Xunit;

namespace Ludium.Api.UnitTests.Startup;

public class JwtSigningKeyGuardTests
{
    [Theory]
    [InlineData("")]
    [InlineData("too-short")]
    public void Startup_GivenMissingOrShortSigningKey_ThrowsAtStartup(string signingKey)
    {
        using var factory = new GuardFactory(signingKey);

        var act = () => factory.CreateClient();

        act.Should().Throw<OptionsValidationException>()
            .WithMessage("*Jwt:SigningKey*");
    }

    [Fact]
    public void Startup_GivenValidSigningKey_StartsSuccessfully()
    {
        using var factory = new GuardFactory("unit-test-signing-key-that-is-long-enough-1234567890");

        var act = () => factory.CreateClient();

        act.Should().NotThrow();
    }

    private sealed class GuardFactory(string signingKey) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unit;Username=u;Password=p",
                    ["Jwt:SigningKey"] = signingKey,
                }));
        }
    }
}
