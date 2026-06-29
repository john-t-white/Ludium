# Dev Team — Implementation Agent Team

All code changes to this repository **must go through the Dev Team**. The team lead coordinates work; teammates own their code areas exclusively and communicate directly with each other.

## Enabling the Team

Agent teams require the experimental flag in `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Automatic Activation

**Whenever any code change is required, always spawn the full Dev Team automatically — do not ask the user, do not implement directly.** This applies to all feature work, bug fixes, refactors, schema changes, infrastructure changes, and CI/CD updates. See `.claude/workflow.md` for the full workflow.

## Team Members

| Name | Agent Type | Owned Area (write) | Read Access |
|---|---|---|---|
| `frontend-dev` | `nextjs-frontend` | `src/web/` | All |
| `backend-dev` | `dotnet-api` | `src/api/`, `src/api.unit-tests/` | All |
| `db-dev` | `postgresql-developer` | `src/db/` | All |
| `infra-dev` | `terraform-engineer` | `infra/` | All |
| `ci-dev` | `github-actions-engineer` | `.github/` | All |
| `test-dev` | `qa-engineer` | `src/api.integration-tests/`, `src/web/e2e/` | All |

## Rules

- **Single owner**: each teammate is the sole agent that may write or edit files in their owned area. No other teammate — and not the lead — makes code changes to that area directly.
- **Read anywhere**: all teammates may read files from any part of the codebase to inform their work.
- **Direct communication**: teammates message each other by name when cross-area coordination is needed (e.g., `backend-dev` messages `db-dev` when a schema change is required).
- **Lead coordinates, does not implement**: the team lead creates tasks, resolves blockers, and synthesizes results but does not write code.
- **All changes via the team**: requests to modify code are routed to the responsible teammate, not implemented directly by the lead.
- **Always report before going idle**: every teammate must send a summary message to the lead before going idle — never go idle without reporting status, findings, or completion. If the lead follows up after an idle notification with no prior report, respond immediately.
- **Unit tests required**: `frontend-dev` and `backend-dev` must write unit tests for every piece of code they implement. Tests are part of the implementation task, not optional follow-up work. Unit tests live inside each developer's owned directory — `frontend-dev` co-locates tests alongside source files in `src/web/` (e.g. `*.test.tsx`); `backend-dev` writes tests in `src/api.unit-tests/`. Neither developer writes into `src/api.integration-tests/` or `src/web/e2e/`, which are owned exclusively by `test-dev`.
- **Integration and E2E tests**: `test-dev` is responsible for all Playwright E2E tests (`src/web/e2e/`) and .NET integration tests (`src/api.integration-tests/`). When `frontend-dev` or `backend-dev` complete their implementation, they must notify `test-dev` with sufficient context so it can write the corresponding integration and E2E tests.
