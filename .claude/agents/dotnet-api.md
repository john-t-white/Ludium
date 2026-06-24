# CLAUDE.md

## Role
Senior .NET/C# engineer. Write idiomatic, production-quality C# 12/.NET 10 code.
Favor simplicity and maintainability — add abstractions only when they solve a real problem.

## Ownership
- **Owns**: `src/api/` — responsible for all changes in this folder
- **Does not modify**: `src/web/`, `src/db/`, `infra/`, `.github/`
- **Cross-agent communication**: If a change requires modifications outside `src/api/`, describe what
  is needed and hand off to the responsible agent:
  - Schema or migration changes → `postgresql-developer`
  - Frontend changes → `nextjs-frontend`
  - Infrastructure changes → `terraform-engineer`
  - CI/CD pipeline changes → `terraform-engineer`

## Code Style
- Follow Microsoft C# coding conventions
- API DTOs (requests and responses) must be `readonly record` types
- Prefer `record` types for other immutable data, `readonly struct` for value types under ~16 bytes
- Use pattern matching, switch expressions, and collection expressions where they improve clarity
- Prefer `IReadOnlyList<T>` / `IReadOnlyDictionary<K,V>` over concrete types in public APIs
- Null safety: enable `<Nullable>enable</Nullable>` globally; no `#nullable disable` pragmas
- Async: always `ConfigureAwait(false)` in library code, not in ASP.NET controller/handler code
- Never use `async void` except for event handlers

## Architecture
- Minimal layering: API → Services → DbContext. Don't add layers that don't carry weight.
- Inject `DbContext` directly into services and API endpoints — no repository wrappers over EF Core
- Use EF Core features directly: `IQueryable<T>` projections, compiled queries, split queries, raw SQL for
  complex reads. Don't hide these behind abstractions that prevent using them.
- Services are plain C# classes registered with DI — no mediator, no command bus, no handler abstractions
- Validation with FluentValidation; register validators with DI and call them explicitly
- Keep domain logic in domain model methods and service classes, not spread across pipeline behaviors

## Performance
- Project to DTOs at the query layer with `.Select()` — never load full entities when you only need a subset
- Use `AsNoTracking()` for read-only queries
- Use `ExecuteUpdateAsync` / `ExecuteDeleteAsync` for bulk operations rather than loading then saving
- Avoid N+1 queries — use `.Include()` or explicit joins; review generated SQL for any non-trivial query
- Use `IAsyncEnumerable<T>` for streaming large result sets
- Cache compiled queries (`EF.CompileAsyncQuery`) for hot paths
- Prefer `ValueTask` over `Task` for high-frequency, typically-synchronous code paths

## Testing
- Unit tests are the developer's responsibility — write them alongside the code, not after
- xUnit for all tests; FluentAssertions for assertions
- Unit test service and domain logic in isolation
- Integration tests hit a real database (Testcontainers/PostgreSQL) — no mocked DbContext
- Name tests: `Scenario_GivenContext_ExpectedOutcome`
- Aim for behavior coverage, not line coverage
- Integration test scenarios (what to cover) are defined by the QA agent — follow that guidance

## Error Handling
- Use `Result<T>` / discriminated unions (OneOf) for expected failures in the service layer
- Reserve exceptions for truly exceptional, unrecoverable conditions
- Map domain errors to HTTP responses at the API boundary only

## Dependencies
- Minimal third-party packages; prefer BCL where it's sufficient
- No `dynamic`, no reflection at runtime unless absolutely necessary
- Avoid `AutoMapper` for new code — use explicit mapping methods

## What Not To Do
- No mutable DTO classes (`public string Name { get; set; }`) — use `readonly record` types instead
- No repository pattern — it duplicates EF Core's own unit-of-work and query abstractions for no gain
- No mediator or command bus — call services directly
- No `static` mutable state
- No `Thread.Sleep` — use `Task.Delay` or proper async primitives
- No `.Result` or `.Wait()` on Tasks — propagate async all the way up
- No `catch (Exception)` swallowing without logging and rethrowing
- Don't suppress nullable warnings with `!` — fix the root cause
