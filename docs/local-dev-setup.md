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

## 6. Configure authentication secrets

The API signs its own session JWT and will **fail to start** without a signing key. Set one via
user-secrets (any random string of at least 32 characters):

```bash
dotnet user-secrets set "Jwt:SigningKey" "some-random-string-at-least-32-characters-long" --project src/api
```

You then have two options for exercising Google sign-in locally:

**Option A — test-login bypass (recommended for local dev, no Google account needed).**
This is the same mechanism the automated test suites use. It mints a real signed-in session for a
fixture user without contacting Google, and is structurally impossible to enable in a production
environment. Enable it with:

```bash
dotnet user-secrets set "Auth:EnableTestLogin" "true" --project src/api
```

(You'll also set `AUTH_ENABLE_TEST_LOGIN=true` for the web app in step 8.)

**Option B — real Google OAuth.** Requires creating your own Google Cloud OAuth Client, since no
shared credentials exist for local development:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, configure the
   OAuth consent screen, and create an OAuth Client ID (type: Web application).
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Set the client ID in the API's user-secrets:

   ```bash
   dotnet user-secrets set "Google:ClientId" "<your_google_client_id>" --project src/api
   ```

4. You'll set the client ID and secret for the web app in step 8.

## 7. Apply database migrations

Bring the database schema up to date:

```bash
dotnet ef database update --project src/db
```

## 8. Run the API

```bash
dotnet run --project src/api
```

The API runs at <http://localhost:5000>.

## 9. Configure and run the web app

In a separate terminal, configure the web app's environment:

```bash
cp src/web/.env.example src/web/.env.local
```

Edit `src/web/.env.local` and set:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
AUTH_SECRET=<any random string, e.g. output of `npx auth secret`>
```

Then, depending on which option you chose in step 6:

- **Option A (test-login bypass):** also set `AUTH_ENABLE_TEST_LOGIN=true`.
- **Option B (real Google OAuth):** also set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the
  values from your Google Cloud OAuth Client.

Start the dev server:

```bash
cd src/web && npm install && npm run dev
```

The web app runs at <http://localhost:3000>.

## 10. Run tests locally

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

## 11. Teardown

- Stop and remove the containers, **preserving** the data volume:

  ```bash
  docker compose down
  ```

- Stop the containers **and remove the data volume** for a full reset (all local database data is lost):

  ```bash
  docker compose down -v
  ```
