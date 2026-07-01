namespace Ludium.Api.Infrastructure;

public readonly struct Result<T>
{
    private readonly T? _value;

    public bool IsSuccess { get; }

    public string? ErrorMessage { get; }

    private Result(bool isSuccess, T? value, string? errorMessage)
    {
        IsSuccess = isSuccess;
        _value = value;
        ErrorMessage = errorMessage;
    }

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access Value on a failed result.");

    public static Result<T> Success(T value) => new(true, value, null);

    public static Result<T> Failure(string errorMessage) => new(false, default, errorMessage);
}
