# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ludium — a social platform for tabletop gaming, targeting web (mobile and desktop).

## Tech Stack

- **Frontend**: Next.js (TypeScript) — `src/web/`
- **Backend**: .NET 10 C# REST API — `src/api/`
- **Database**: PostgreSQL — migrations at `src/db/`
- **Hosting**: Azure
- **Infrastructure**: Terraform — `infra/`
- **CI/CD**: GitHub Actions — `.github/`

## Environments

| Environment | Purpose | Infrastructure |
|---|---|---|
| **Local** | Developer workstation | Docker Compose — no Azure required |
| **PR** | Full ephemeral deployment per open PR | Azure, provisioned by Terraform on PR open |
| **Production** | Live application | Azure, deployed on merge to `main` |

### Local
PostgreSQL and all dependencies run via Docker Compose. The application must always be fully runnable on a developer workstation without any Azure access or credentials.

```bash
docker compose up -d
```

### PR
When a PR is opened, GitHub Actions provisions a dedicated Azure environment via Terraform and deploys the full application. All integration and UI tests run automatically on PR open and on every subsequent push to the PR branch. When a PR is merged or closed, the environment is torn down and all Azure resources are removed.

A scheduled GitHub Action runs daily to audit for any PR environments whose PR is no longer open and tears them down.

### Production
Deployed automatically on merge to `main`. The PR environment is torn down as part of the same pipeline.

## Git Workflow

- Feature branches for all enhancement work
- No direct commits to `main`
- All changes merge to `main` via pull request

## Security

- **Never commit secrets** — no API keys, connection strings, passwords, or tokens in source control under any circumstances
- If a secret is accidentally committed, treat it as compromised immediately — rotate it before removing it from history
- GitHub Actions secrets are managed through the GitHub repository settings, not hardcoded in workflow files
