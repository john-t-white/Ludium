# src/api

.NET 10 REST API for Ludium. C# 12, ASP.NET Core minimal APIs.

## Running Locally

```bash
# From repo root — PostgreSQL must be running via Docker Compose
docker compose up -d db
dotnet run --project src/api
```

API runs at `http://localhost:5000`. Swagger UI at `/swagger`.

## Project Structure

```
src/api/
├── Features/
│   ├── Users/
│   │   ├── UserEndpoints.cs      # route registrations
│   │   ├── UserService.cs        # business logic
│   │   ├── UserContracts.cs      # readonly record request/response DTOs
│   │   ├── UserValidator.cs      # FluentValidation validators
│   │   └── User.cs               # EF Core entity + domain methods
│   ├── Games/
│   │   └── ...
│   └── ...                       # one folder per feature
├── Data/
│   ├── AppDbContext.cs
│   └── SeedData.cs               # development-only seed data, never applied to production
├── Infrastructure/               # cross-cutting: auth, email, HTTP clients
├── appsettings.json
└── appsettings.local.json        # gitignored — local overrides only, never committed
```

## Key Commands

```bash
dotnet build src/api                                              # build
dotnet test src/api.tests                                         # unit + integration tests
dotnet user-secrets init --project src/api                        # first-time secrets setup
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..." --project src/api
```

Migrations are managed in `src/db/` — see `src/db/CLAUDE.md`.

## Conventions

- Each feature is self-contained under `Features/<Name>/` — endpoints, service, entity, contracts, and validators together
- No cross-feature service dependencies; features that share data query the DbContext directly
- Endpoints are registered via extension methods on `IEndpointRouteBuilder` in each feature's `*Endpoints.cs`
- DTOs live in `*Contracts.cs` as `readonly record` types; never expose EF entities directly over the wire
- Services receive a scoped `AppDbContext`; no repository layer
- FluentValidation validators live alongside the request type they validate
- `appsettings.json` holds structure and production-safe defaults only — no secrets and no local overrides
- Local config overrides go in `appsettings.*.local.json` (gitignored) — never modify `appsettings.json` for local dev
- Secrets: locally via .NET user-secrets (`dotnet user-secrets`); in PR and production environments via Azure Key Vault

## API Compatibility

- Never remove or rename a response field without a deprecation period — cached web clients may depend on it
- Never change a field's type (e.g. `string` → `number`) — treat it as a removal and addition
- New required request fields break existing clients — introduce as optional first, make required in a later release
  once all clients have been updated
- Adding new optional response fields and new endpoints is always safe
- Coordinate breaking changes with the web deployment — the API and web client must be deployed together,
  or the API must remain backwards compatible until the new web client is fully propagated through the CDN cache

## Auth

- The API does not implement OAuth directly — the web layer handles the OAuth flow via Auth.js
- On login, the web app sends the OAuth identity token (Google/Facebook) to `POST /auth/login`
- The API validates the token with the provider, then looks up or creates the local user record
- First-time OAuth login provisions a new user account — handle this in the auth endpoint, not as a side effect elsewhere
- After validation, the API issues its own application JWT; all subsequent requests authenticate with this token
- JWT signing key is stored in Azure Key Vault; never hardcoded or in appsettings
- Claims-based authorization; policies defined in `Infrastructure/Auth/`
- User identity resolved via `HttpContext.User` extension methods — never pass raw user IDs as route params without validating ownership
