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

## Activation

**Whenever any code change is required, spawn the Dev Team — do not implement directly.** Spawn only the members whose owned area is affected by the change. See `.claude/workflow.md` for the full workflow and tier definitions.

**How to scope the team:** Before spawning, assess which directories will have changed files. Spawn only those members. Always include `test-dev` whenever `frontend-dev` or `backend-dev` is spawned. Only spawn `infra-dev` and `ci-dev` when the change explicitly touches `infra/` or `.github/`.

| Typical change | Spawn |
|---|---|
| Frontend-only (UI, styles, components) | `frontend-dev`, `test-dev` |
| Backend-only (API endpoints, business logic) | `backend-dev`, `test-dev` |
| Full-stack feature (frontend + API) | `frontend-dev`, `backend-dev`, `test-dev` |
| Full-stack with schema change | `frontend-dev`, `backend-dev`, `db-dev`, `test-dev` |
| Cross-cutting / infra / CI change | All relevant members |

## Team Members

| Name | Agent Type | Owned Area (write) | Read Access |
|---|---|---|---|
| `frontend-dev` | `nextjs-frontend` | `src/web/` | All |
| `backend-dev` | `dotnet-api` | `src/api/`, `src/api.unit-tests/` | All |
| `db-dev` | `postgresql-developer` | `src/db/` | All |
| `infra-dev` | `terraform-engineer` | `infra/` | All |
| `ci-dev` | `github-actions-engineer` | `.github/` | All |
| `test-dev` | `qa-engineer` | `src/api.integration-tests/`, `src/web/e2e/` | All |

## Coding Behavior

- **Think before coding** — state assumptions explicitly; if multiple interpretations exist or something is unclear, stop and ask rather than guessing (with a suggested default, per `workflow.md` Phase 1).
- **Simplicity first** — implement the minimum that satisfies the request; no speculative features, unrequested abstractions/configurability, or error handling for impossible scenarios.
- **Surgical changes** — touch only what the task requires; don't refactor, reformat, or "improve" unrelated code; remove only the imports/variables/functions your own change orphaned, not pre-existing dead code.
- **Goal-driven execution** — turn the task into a verifiable check (e.g. a failing test that passes once the fix lands) and use that to know when the task is actually done, not just "looks right."
- Use judgement on trivial tasks (typo fixes, simple renames) — don't over-apply these for small changes.

## Rules

- **Single owner**: each teammate is the sole agent that may write or edit files in their owned area. No other teammate — and not the lead — makes code changes to that area directly.
- **Read anywhere**: all teammates may read files from any part of the codebase to inform their work.
- **Direct communication**: teammates message each other by name when cross-area coordination is needed (e.g., `backend-dev` messages `db-dev` when a schema change is required).
- **Lead coordinates, does not implement**: the team lead creates tasks, resolves blockers, and synthesizes results but does not write code.
- **All changes via the team**: requests to modify code are routed to the responsible teammate, not implemented directly by the lead.
- **Always report before going idle**: every teammate must send a summary message to the lead before going idle — never go idle without reporting status, findings, or completion. If the lead follows up after an idle notification with no prior report, respond immediately.
- **Idle no-op**: if you are spawned but your owned area has no files affected by the change, send exactly one message — `"[your-name]: Area unaffected — no action needed."` — and stop immediately. Do not wait for further instructions or read requirements in detail.
- **Unit tests required**: `frontend-dev` and `backend-dev` must write unit tests for every piece of code they implement. Tests are part of the implementation task, not optional follow-up work. Unit tests live inside each developer's owned directory — `frontend-dev` co-locates tests alongside source files in `src/web/` (e.g. `*.test.tsx`); `backend-dev` writes tests in `src/api.unit-tests/`. Neither developer writes into `src/api.integration-tests/` or `src/web/e2e/`, which are owned exclusively by `test-dev`.
- **Integration and E2E tests**: `test-dev` is responsible for all Playwright E2E tests (`src/web/e2e/`) and .NET integration tests (`src/api.integration-tests/`). When `frontend-dev` or `backend-dev` complete their implementation, they must notify `test-dev` with sufficient context so it can write the corresponding integration and E2E tests.
