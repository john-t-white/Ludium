# src/db

EF Core migrations for the Ludium PostgreSQL schema. This project owns the database schema only — it has no runtime API code and is not included in API deployment artifacts.

## Running Locally

```bash
# Apply all pending migrations
dotnet ef database update --project src/db

# Revert to a specific migration
dotnet ef database update <MigrationName> --project src/db
```

PostgreSQL must be running via Docker Compose before applying migrations:

```bash
docker compose up -d db
```

## Key Commands

```bash
dotnet ef migrations add <Name> --project src/db          # create a new migration
dotnet ef migrations remove --project src/db              # remove the last migration (unapplied only)
dotnet ef migrations list --project src/db                # list all migrations and their status
dotnet ef migrations script --project src/db              # generate SQL script for all migrations
dotnet ef migrations script <From> <To> --project src/db  # generate SQL for a specific range
```

## Migration Conventions

- Migration names must describe the schema change, not the feature: `AddUserProfileTable`, `AddIndexOnGameSlug`, not `UserFeature` or `Sprint3Changes`
- One logical change per migration — don't bundle unrelated schema changes
- Always review the generated migration file before applying; EF Core sometimes generates unexpected SQL
- Generate and review the SQL script (`migrations script`) before applying to any non-local environment
- Never edit a migration that has already been applied to any environment — create a new corrective migration instead
- Reference and lookup data (roles, categories, status codes) belongs in migrations — it is part of the schema
  and must be consistent across all environments. Use `migrationBuilder.InsertData()` or raw SQL inserts.
- Development-only seed data (fake users, sample content) lives in `Data/SeedData.cs` in the API project
  and is never applied to production

## Safety Rules

- Never use `--force` to overwrite a migration that has been applied
- Dropping a column or table must be a two-step process: first deploy the code change that stops using it, then migrate
- All schema changes must be backwards-compatible with the previous version of the API — zero-downtime deploys require this

## Local vs Azure PostgreSQL

- The local Docker PostgreSQL version must match the Azure Flexible Server version — check `docker-compose.yml` before assuming compatibility
- Write migrations assuming a least-privilege app user, not a superuser; avoid DDL that requires elevated grants
- Azure PostgreSQL only supports an allowlisted set of extensions — verify any `CREATE EXTENSION` against the Azure allowlist before writing the migration
