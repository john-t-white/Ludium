# Local Development Setup

This guide walks you through running the full Ludium stack on your workstation: PostgreSQL,
the .NET API, the Next.js web app, and the test suites. No Azure access or credentials are
required for local development.

Follow the steps in order — the guide is runnable top to bottom.

## 1. Prerequisites

Install the following before you begin:

- **Docker Desktop** — runs the local PostgreSQL container (and the Testcontainers used by the
  integration tests). Make sure the Docker daemon is running.
- **.NET 10 SDK** — builds and runs the API.
- **Node.js (LTS)** — builds and runs the web app.
- **dotnet-ef global tool** — applies database migrations:

  ```bash
  dotnet tool install --global dotnet-ef
  ```

## 2. Clone the repository

```bash
git clone https://github.com/<your-org>/Ludium.git
cd Ludium
```

## 3. Configure environment variables

Copy the example environment file and use it as-is for local development:

```bash
cp .env.example .env
```

Set `POSTGRES_PASSWORD` to any value you choose — this will be the password for your local
PostgreSQL container. `.env` is gitignored, so your local values are never committed.

> **Note:** If your password contains a `$`, escape it as `$$` in the `.env` file — Docker Compose
> interpolates `$` as a variable reference. For example, a password of `$ecret` must be written
> as `POSTGRES_PASSWORD=$$ecret`. Passwords without `$` do not need escaping.

## 4. Start PostgreSQL

Start the database container in the background:

```bash
docker compose up -d db
```

Verify it is running and healthy:

```bash
docker compose ps
```

The `db` service should report a `running`/`healthy` status before you continue.

## 5. Configure the API connection string

The API reads its database connection string from .NET user-secrets. This aligns with how the API
reads secrets from Azure Key Vault in the PR and production environments — secrets are never stored
in source-controlled config.

Initialize user-secrets for the API project and set the connection string:

```bash
dotnet user-secrets init --project src/api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=ludium;Username=ludium;Password=<your_password>" --project src/api
```

> **Note:** Replace `<your_password>` with the value you set for `POSTGRES_PASSWORD` in your `.env` file.

## 6. Apply database migrations

Bring the database schema up to date:

```bash
dotnet ef database update --project src/db
```

> **Note:** If `src/db` has no `.csproj` file yet, skip this step — the migrations project has not
> been scaffolded. The `ludium` database is created automatically by the container; migrations will
> be added as features are built.

## 7. Run the API

```bash
dotnet run --project src/api
```

The API runs at <http://localhost:5000>, with Swagger UI available at <http://localhost:5000/swagger>.

## 8. Configure and run the web app

In a separate terminal, configure the web app's environment and start the dev server:

```bash
cp src/web/.env.example src/web/.env.local
# Edit src/web/.env.local and set: NEXT_PUBLIC_API_URL=http://localhost:5000
cd src/web && npm install && npm run dev
```

The web app runs at <http://localhost:3000>.

## 9. Run tests locally

- **Integration tests** (.NET) — requires the Docker daemon to be running; Testcontainers spins up its
  own PostgreSQL container, so you do not need the `docker compose` database for these:

  ```bash
  dotnet test src/api.integration-tests
  ```

- **E2E tests** (Playwright) — run from the web app directory:

  ```bash
  npm run test:e2e
  ```

  (from `src/web/`)

## 10. Teardown

- Stop and remove the containers, **preserving** the data volume:

  ```bash
  docker compose down
  ```

- Stop the containers **and remove the data volume** for a full reset (all local database data is lost):

  ```bash
  docker compose down -v
  ```
