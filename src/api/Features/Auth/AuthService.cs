using Ludium.Api.Data;
using Ludium.Api.Features.Users;
using Ludium.Api.Infrastructure;
using Ludium.Api.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Ludium.Api.Features.Auth;

public sealed class AuthService(
    AppDbContext dbContext,
    IGoogleTokenValidator googleTokenValidator,
    IJwtIssuer jwtIssuer)
{
    private const string DefaultDisplayName = "Ludium Player";

    public async Task<Result<LoginResponse>> LoginAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var googleUser = await googleTokenValidator.ValidateAsync(idToken).ConfigureAwait(false);
        if (googleUser is null)
        {
            return Result<LoginResponse>.Failure("The Google token could not be validated.");
        }

        var info = googleUser.Value;
        var user = await UpsertUserAsync(info.Subject, ResolveDisplayName(info), cancellationToken).ConfigureAwait(false);
        return Result<LoginResponse>.Success(BuildResponse(user));
    }

    public async Task<LoginResponse> TestLoginAsync(
        string googleSubjectId,
        string name,
        CancellationToken cancellationToken = default)
    {
        var user = await UpsertUserAsync(googleSubjectId, name, cancellationToken).ConfigureAwait(false);
        return BuildResponse(user);
    }

    private LoginResponse BuildResponse(User user)
        => new(jwtIssuer.Issue(user), new UserResponse(user.Id, user.Name));

    private async Task<User> UpsertUserAsync(string googleSubjectId, string name, CancellationToken cancellationToken)
    {
        var existing = await dbContext.Users
            .FirstOrDefaultAsync(u => u.GoogleSubjectId == googleSubjectId, cancellationToken)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            return existing;
        }

        var user = User.CreateFromGoogle(googleSubjectId, name);
        dbContext.Users.Add(user);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return user;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Concurrent first-login race: another request inserted the same google_subject_id
            // first, tripping the uq_users_google_subject_id constraint. Detach our failed insert
            // and return the row that won so both callers see the same account.
            dbContext.Entry(user).State = EntityState.Detached;

            var winner = await dbContext.Users
                .FirstOrDefaultAsync(u => u.GoogleSubjectId == googleSubjectId, cancellationToken)
                .ConfigureAwait(false);
            if (winner is null)
            {
                throw;
            }

            return winner;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private static string ResolveDisplayName(GoogleUserInfo info)
    {
        if (!string.IsNullOrWhiteSpace(info.Name))
        {
            return info.Name;
        }

        if (!string.IsNullOrWhiteSpace(info.GivenName))
        {
            return info.GivenName;
        }

        if (!string.IsNullOrWhiteSpace(info.Email))
        {
            var localPart = info.Email.Split('@', 2)[0];
            if (!string.IsNullOrWhiteSpace(localPart))
            {
                return localPart;
            }
        }

        return DefaultDisplayName;
    }
}
