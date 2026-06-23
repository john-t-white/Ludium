# Ludium

A social web platform for tabletop board games, designed to work on both mobile and desktop.

## Tech Stack

- **Frontend**: Next.js (TypeScript) — `src/web`
- **Backend**: .NET 10 C# — `src/api`
- **Database**: PostgreSQL
- **Hosting**: Azure
- **Infrastructure**: Terraform, deployed via GitHub Actions

## Project Structure

```
src/
  web/      # Next.js frontend
  api/      # .NET 10 C# backend
infra/      # Terraform infrastructure
.github/    # GitHub Actions workflows
```

## Local Development

PostgreSQL runs locally via Docker Compose — no Azure required for local development.

```bash
# Start local database
docker compose up -d

# Run the API
cd src/api && dotnet run

# Run the frontend
cd src/web && npm run dev
```

Application secrets locally use .NET User Secrets for the API. Never commit secrets to the repo.

## Running Tests

```bash
# API integration tests
cd src/api && dotnet test

# Frontend Playwright tests
cd src/web && npx playwright test
```

## Code Style

### C#
- Nullable reference types enabled
- File-scoped namespaces
- Tabs for indentation

### TypeScript / JavaScript
- TypeScript always — no plain `.js` files
- ESLint + Prettier enforced
- Tabs for indentation
- Exception: use spaces in files where the language/tooling requires it (e.g. YAML)

## Git Workflow

- **All work starts from a GitHub issue** — never write code without a corresponding issue
- Feature branches: `feature/{issueId}` (e.g. `feature/42`)
- No code is ever committed or pushed directly to `main`
- All changes go through a pull request

## CI/CD

On PR creation, GitHub Actions + Terraform provisions an ephemeral Azure environment for that PR. Integration and Playwright tests run against it and report results back to the PR. The environment URL is posted to the PR.

On merge to `main`, the PR environment is torn down and the change is deployed to production.

## Secrets

| Secret | Local | Production |
|---|---|---|
| App secrets | .NET User Secrets | Azure Key Vault |
| GitHub token | `.claude/settings.local.json` | GitHub Actions secret |

Never commit secrets or `.env` files containing real values.

## Claude Behaviors

- Always start from a GitHub issue before writing any code
- Always write tests alongside new code (integration tests for API, Playwright for frontend)
- Never modify Terraform or infrastructure files without explicitly confirming with the user first
