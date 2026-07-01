using FluentValidation;

namespace Ludium.Api.Features.Auth;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.IdToken).NotEmpty();
    }
}

public sealed class TestLoginRequestValidator : AbstractValidator<TestLoginRequest>
{
    public TestLoginRequestValidator()
    {
        RuleFor(x => x.GoogleSubjectId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty();
    }
}
