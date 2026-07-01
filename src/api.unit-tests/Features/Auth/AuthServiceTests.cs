using FluentAssertions;
using Ludium.Api.Data;
using Ludium.Api.Features.Auth;
using Ludium.Api.Features.Users;
using Ludium.Api.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;

namespace Ludium.Api.UnitTests.Features.Auth;

public class AuthServiceTests
{
    [Fact]
    public async Task LoginAsync_GivenFirstTimeGoogleUser_CreatesAccount()
    {
        await using var db = CreateDb(out var options);
        var service = new AuthService(db, ValidatorReturning(new GoogleUserInfo("google-sub-1", "Ada Lovelace", null, null)), new StubJwtIssuer());

        var result = await service.LoginAsync("id-token");

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Name.Should().Be("Ada Lovelace");
        result.Value.Token.Should().NotBeNullOrEmpty();

        var stored = await db.Users.SingleAsync();
        stored.GoogleSubjectId.Should().Be("google-sub-1");
        stored.Id.Should().Be(result.Value.User.Id);
    }

    [Fact]
    public async Task LoginAsync_GivenReturningGoogleUser_ReturnsSameAccountWithoutDuplicate()
    {
        await using var db = CreateDb(out _);
        var existing = User.CreateFromGoogle("google-sub-1", "Original Name");
        db.Users.Add(existing);
        await db.SaveChangesAsync();

        var service = new AuthService(db, ValidatorReturning(new GoogleUserInfo("google-sub-1", "Changed Name", null, null)), new StubJwtIssuer());

        var result = await service.LoginAsync("id-token");

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Id.Should().Be(existing.Id);
        // Name is captured at first login and not refreshed on subsequent sign-ins.
        result.Value.User.Name.Should().Be("Original Name");
        (await db.Users.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task LoginAsync_GivenInvalidGoogleToken_ReturnsFailureAndCreatesNoUser()
    {
        await using var db = CreateDb(out _);
        var service = new AuthService(db, ValidatorReturning(null), new StubJwtIssuer());

        var result = await service.LoginAsync("bad-token");

        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().NotBeNullOrEmpty();
        (await db.Users.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("Full Name", "Given", "user@example.com", "Full Name")]
    [InlineData("", "Given", "user@example.com", "Given")]
    [InlineData(null, null, "user@example.com", "user")]
    [InlineData("  ", "  ", "  ", "Ludium Player")]
    [InlineData(null, null, null, "Ludium Player")]
    public async Task LoginAsync_ResolvesDisplayNameWithFallback(string? name, string? givenName, string? email, string expected)
    {
        await using var db = CreateDb(out _);
        var service = new AuthService(db, ValidatorReturning(new GoogleUserInfo("google-sub-1", name, givenName, email)), new StubJwtIssuer());

        var result = await service.LoginAsync("id-token");

        result.Value.User.Name.Should().Be(expected);
    }

    [Fact]
    public async Task LoginAsync_GivenConcurrentFirstLoginRace_ReturnsExistingWinnerNoDuplicate()
    {
        var winner = User.CreateFromGoogle("google-sub-1", "Winner");
        await using var db = CreateRacingDb(winner, out _);
        var service = new AuthService(db, ValidatorReturning(new GoogleUserInfo("google-sub-1", "Loser", null, null)), new StubJwtIssuer());

        var result = await service.LoginAsync("id-token");

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Id.Should().Be(winner.Id);
        (await db.Users.CountAsync(u => u.GoogleSubjectId == "google-sub-1")).Should().Be(1);
    }

    [Fact]
    public async Task LoginAsync_GivenNonUniqueDbError_Propagates()
    {
        await using var db = new FailingDbContext(
            InMemoryOptions(),
            new DbUpdateException("boom", new PostgresException("boom", "ERROR", "ERROR", "40001")));
        var service = new AuthService(db, ValidatorReturning(new GoogleUserInfo("google-sub-1", "Name", null, null)), new StubJwtIssuer());

        var act = () => service.LoginAsync("id-token");

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task TestLoginAsync_GivenNewSubject_CreatesAccount()
    {
        await using var db = CreateDb(out _);
        var service = new AuthService(db, ValidatorReturning(null), new StubJwtIssuer());

        var response = await service.TestLoginAsync("google-sub-9", "Fixture User");

        response.User.Name.Should().Be("Fixture User");
        response.Token.Should().NotBeNullOrEmpty();
        (await db.Users.SingleAsync()).GoogleSubjectId.Should().Be("google-sub-9");
    }

    [Fact]
    public async Task TestLoginAsync_GivenReturningSubject_ReusesAccount()
    {
        await using var db = CreateDb(out _);
        var existing = User.CreateFromGoogle("google-sub-9", "Fixture User");
        db.Users.Add(existing);
        await db.SaveChangesAsync();
        var service = new AuthService(db, ValidatorReturning(null), new StubJwtIssuer());

        var response = await service.TestLoginAsync("google-sub-9", "Fixture User");

        response.User.Id.Should().Be(existing.Id);
        (await db.Users.CountAsync()).Should().Be(1);
    }

    private static DbContextOptions<AppDbContext> InMemoryOptions()
        => new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static AppDbContext CreateDb(out DbContextOptions<AppDbContext> options)
    {
        options = InMemoryOptions();
        return new AppDbContext(options);
    }

    private static AppDbContext CreateRacingDb(User winner, out DbContextOptions<AppDbContext> options)
    {
        options = InMemoryOptions();
        return new RacingDbContext(options, winner);
    }

    private static IGoogleTokenValidator ValidatorReturning(GoogleUserInfo? result) => new StubGoogleValidator(result);

    private sealed class StubGoogleValidator(GoogleUserInfo? result) : IGoogleTokenValidator
    {
        public Task<GoogleUserInfo?> ValidateAsync(string idToken) => Task.FromResult(result);
    }

    private sealed class StubJwtIssuer : IJwtIssuer
    {
        public string Issue(User user) => $"token-for-{user.Id}";
    }

    // Throws a fixed exception on the first SaveChangesAsync, letting tests exercise error paths.
    private sealed class FailingDbContext(DbContextOptions<AppDbContext> options, Exception toThrow) : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => throw toThrow;
    }

    // Simulates a concurrent first-login: the first SaveChangesAsync commits the winner row
    // out-of-band (via a sibling context on the same in-memory store) and then throws the
    // unique-violation the real database would raise, so the service's catch/re-query runs.
    private sealed class RacingDbContext(DbContextOptions<AppDbContext> options, User winner) : AppDbContext(options)
    {
        private readonly DbContextOptions<AppDbContext> _options = options;
        private readonly User _winner = winner;
        private bool _thrown;

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (!_thrown)
            {
                _thrown = true;
                await using (var sibling = new AppDbContext(_options))
                {
                    sibling.Users.Add(_winner);
                    await sibling.SaveChangesAsync(cancellationToken);
                }

                throw new DbUpdateException(
                    "duplicate key",
                    new PostgresException("duplicate key", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
