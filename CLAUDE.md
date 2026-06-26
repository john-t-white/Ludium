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
- **Always start from the latest `main`**: before creating a feature branch, fetch and pull the latest `main` unless the user explicitly specifies a different base branch or starting point

## Security

- **Never commit secrets** — no API keys, connection strings, passwords, or tokens in source control under any circumstances
- If a secret is accidentally committed, treat it as compromised immediately — rotate it before removing it from history
- GitHub Actions secrets are managed through the GitHub repository settings, not hardcoded in workflow files

## Dev Team — Implementation Agent Team

All code changes to this repository **must go through the Dev Team**. The team lead coordinates work; teammates own their code areas exclusively and communicate directly with each other.

### Enabling the Team

Agent teams require the experimental flag in `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Automatic Activation

**Whenever any code change is required, always spawn the full Dev Team automatically — do not ask the user, do not implement directly.** This applies to all feature work, bug fixes, refactors, schema changes, infrastructure changes, and CI/CD updates.

Spawn configuration (use this every time):

```text
Spawn the Dev Team:
- frontend-dev using the nextjs-frontend agent type to own src/web/
- backend-dev as a .NET 10 C# REST API senior developer to own src/api/
- db-dev using the postgresql-developer agent type to own src/db/
- infra-dev using the terraform-engineer agent type as a Terraform and Azure senior engineer to own infra/
- ci-dev as a GitHub Actions and Azure senior engineer to own .github/
- test-dev using the qa-engineer agent type to own tests/ and e2e/
All teammates use the leader's model. No teammate may edit files outside their owned area.
```

### Team Members

| Name | Agent Type | Owned Area (write) | Read Access |
|---|---|---|---|
| `frontend-dev` | `nextjs-frontend` | `src/web/` | All |
| `backend-dev` | .NET 10 C# REST API senior developer | `src/api/` | All |
| `db-dev` | `postgresql-developer` | `src/db/` | All |
| `infra-dev` | `terraform-engineer` — Terraform & Azure senior engineer | `infra/` | All |
| `ci-dev` | GitHub Actions & Azure senior engineer | `.github/` | All |
| `test-dev` | `qa-engineer` | `src/api.integration-tests/`, `src/web/e2e/` | All |

### Rules

- **Single owner**: each teammate is the sole agent that may write or edit files in their owned area. No other teammate — and not the lead — makes code changes to that area directly.
- **Read anywhere**: all teammates may read files from any part of the codebase to inform their work.
- **Direct communication**: teammates message each other by name when cross-area coordination is needed (e.g., `backend-dev` messages `db-dev` when a schema change is required).
- **Lead coordinates, does not implement**: the team lead creates tasks, resolves blockers, and synthesizes results but does not write code.
- **All changes via the team**: requests to modify code are routed to the responsible teammate, not implemented directly by the lead.
- **Unit tests required**: `frontend-dev` and `backend-dev` must write unit tests for every piece of code they implement. Tests are part of the implementation task, not optional follow-up work. Unit tests live inside each developer's owned directory — `frontend-dev` co-locates tests alongside source files in `src/web/` (e.g. `*.test.tsx`); `backend-dev` writes tests in `src/api.unit-tests/`. Neither developer writes into `src/api.integration-tests/` or `src/web/e2e/`, which are owned exclusively by `test-dev`.
- **Integration and E2E tests**: `test-dev` is responsible for all Playwright E2E tests (`src/web/e2e/`) and .NET integration tests (`src/api.integration-tests/`). When `frontend-dev` or `backend-dev` complete their implementation, they must notify `test-dev` with sufficient context so it can write the corresponding integration and E2E tests.

### Workflow

Every request that involves code changes follows four phases in order. Do not skip or reorder phases.

#### Phase 1 — Requirements Analysis

1. Lead receives a feature or bug request and spawns the Dev Team.
2. Each Dev Team member reads the requirements and the relevant areas of the codebase from their perspective.
3. Dev Team members communicate with each other to identify gaps, ambiguities, and cross-area dependencies.
4. Dev Team formulates clarifying questions. **Every question must include a suggested answer or default.** Do not assume and proceed — present suggestions and wait for user confirmation.
5. Lead consolidates all clarifying questions and suggestions and presents them to the user in a single grouped list.
6. User confirms, adjusts, or overrides the suggestions.

#### Phase 2 — Planning

1. Dev Team creates a detailed implementation plan based on the clarified requirements: which files change, what the change is, and the order of operations with cross-area dependencies mapped.
2. Lead automatically spawns the QA Team to review the plan (see QA Team — Plan Review below).
3. QA Team returns plan findings to the lead.
4. Lead incorporates any blocking plan concerns — routing back to the relevant Dev Team member to revise the plan — then presents a concise plan summary to the user:
   - What will change and why
   - Which team members are involved and what they will do
   - Any risks or trade-offs flagged by the QA Team
5. **User must explicitly approve the plan before implementation begins.** Do not proceed without approval.

#### Phase 3 — Implementation

1. Lead runs `git fetch origin && git checkout main && git pull origin main` to ensure the local `main` is up to date, then creates and checks out the feature branch from that point (unless the user specified a different base).
2. On user approval, Dev Team members claim their tasks and implement within their owned areas.
3. Teammates communicate directly when a change in one area requires a coordinating change in another.
4. Lead monitors progress and resolves blockers.

#### Phase 4 — Implementation Review

1. Dev Team signals completion to the lead.
2. Lead automatically spawns the QA Team to review the implemented changes (see QA Team — Implementation Review below).
3. Lead collects all findings, routes any blocking issues back to the responsible Dev Team member for fixes.
4. Once all blocking findings are resolved, lead opens the pull request.

---

## QA Team — Review Agent Team

The QA Team is involved twice in every change: once to review the **plan** and once to review the **implementation**. Reviewers never write or modify code — they read, assess, and report findings to the lead.

### Team Members

| Name | Agent Type | Review Lens | Can Write Code |
|---|---|---|---|
| `security-reviewer` | `security-engineer` | Vulnerabilities, auth, secrets, OWASP top 10 | No |
| `quality-reviewer` | `claude` | Bugs, logic errors, edge cases, correctness; unit tests pass and code coverage is adequate | No |
| `test-reviewer` | `qa-engineer` | Test coverage, test quality, missing cases | No |
| `performance-reviewer` | `claude` | Bottlenecks, inefficiencies, scalability | No |
| `ac-reviewer` | `claude` | Acceptance criteria and requirements validation | No |

### Rules

- **Read-only**: no QA Team member may edit or create files. Findings are reported to the lead only.
- **Direct communication**: reviewers message each other by name when a finding spans multiple lenses.
- **Blocking findings**: the lead must resolve all blocking findings before proceeding to the next phase.
- **Non-blocking findings**: recorded and included in the PR description but do not delay progress.

### Plan Review

**Automatically spawned by the lead during Dev Team Phase 2.** Reviewers assess the plan before a single line of code is written.

```text
Spawn the QA Team to review the implementation plan:
- security-reviewer using the security-engineer agent type to identify security risks in the proposed approach
- quality-reviewer to flag correctness issues, logic gaps, missing edge case handling, and whether the plan includes unit tests for all frontend and backend code
- test-reviewer using the qa-engineer agent type to assess whether the plan includes sufficient test coverage
- performance-reviewer to identify performance or scalability risks in the proposed design
- ac-reviewer to verify the plan fully addresses all acceptance criteria and requirements
Reviewers may read any file but must not modify code. All teammates use the leader's model.
```

### Implementation Review

**Automatically spawned by the lead after Dev Team Phase 3 completes.** Reviewers assess the actual changes made.

```text
Spawn the QA Team to review all changes implemented by the Dev Team:
- security-reviewer using the security-engineer agent type to review for vulnerabilities, auth issues, secrets, and OWASP top 10
- quality-reviewer to review for bugs, logic errors, and code correctness; verify all unit tests written by frontend-dev and backend-dev pass and that code coverage is adequate for the changes made
- test-reviewer using the qa-engineer agent type to review test coverage and test quality
- performance-reviewer to review for bottlenecks, inefficiencies, and scalability concerns
- ac-reviewer to verify all acceptance criteria and requirements are met by the implementation
Reviewers may read any file but must not modify code. All teammates use the leader's model.
```
