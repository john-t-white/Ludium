namespace Ludium.Api.Features.Users;

public class User
{
    public Guid Id { get; private set; }

    public string GoogleSubjectId { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }

    private User()
    {
    }

    public static User CreateFromGoogle(string googleSubjectId, string name)
    {
        return new User
        {
            Id = Guid.CreateVersion7(),
            GoogleSubjectId = googleSubjectId,
            Name = name,
        };
    }
}
