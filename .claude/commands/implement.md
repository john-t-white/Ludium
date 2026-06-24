# /implement

Implement a GitHub issue using the full agent team.

## Usage
/implement <issue-number>

## Rules
- **Nothing is committed or pushed until the user explicitly approves** — agents implement changes
  locally only; no `git commit`, `git push`, or PR creation happens without user sign-off
- After implementation, present a summary of all changes and ask the user to approve before committing

## Steps

### 1. Fetch the issue
Run `gh issue view <issue-number> --json title,body,labels` to get the full issue details.

### 2. Planning phase
Spawn planning agents in parallel — one per relevant domain. Each agent reads the issue and returns:
- What changes they need to make
- Any dependencies on other agents (e.g. "needs schema change first")
- Estimated scope (files affected)
- Any ambiguities or open questions, each with 2-3 concrete suggested approaches

Spawn only the agents relevant to the issue:
- `dotnet-api` — API or business logic changes
- `nextjs-frontend` — UI or frontend changes
- `postgresql-developer` — schema or migration changes
- `terraform-engineer` — infrastructure or environment changes
- `qa-engineer` — always include to plan test coverage
- `security-engineer` — always include to flag security implications upfront

### 3. Clarification before planning
After the planning agents return, collect all ambiguities and open questions they raised.
If any exist, do NOT proceed to implementation — present them to the user grouped by agent with
suggested approaches for each, and ask the user to choose or provide direction.

Ambiguities must be surfaced rather than assumed. Examples of things that require clarification:
- Multiple valid approaches with different trade-offs (e.g. soft delete vs hard delete)
- Unclear scope (e.g. "update the profile page" — which fields?)
- Missing acceptance criteria (e.g. "improve performance" — what is the target?)
- Security or auth implications that aren't specified (e.g. who can access this endpoint?)

Once the user has answered, pass their decisions back to the relevant agents before finalising the plan.

### 4. Synthesize and present the plan
Combine the agent plans into a unified implementation plan showing:
- What each agent will implement, incorporating the user's clarification decisions
- The dependency order (schema → API → frontend)
- What QA will test and what security will review

Present the full plan to the user and ask for approval. If further changes are requested, revise and ask again.

### 5. On approval
- Pull latest main and create the feature branch:
  `git checkout main && git pull && git checkout -b feature/issue-<number>-<slug>`
- Launch the implementation workflow, passing the issue number, branch name, and approved plan as args

The workflow must include these phases in order:

#### Phase 1 — Implement
Spawn implementation agents in parallel (API, frontend, DB, etc.) and QA test agents. Each
agent implements its part of the approved plan.

#### Phase 2 — Security review
Spawn the `security-engineer` agent to review ALL files changed in Phase 1. The agent returns
a structured list of findings: severity (critical/high/medium/low/info), description, and
recommended fix for each.

#### Phase 3 — Fix security findings
For each HIGH or MEDIUM finding, send it back to the relevant implementation agent to fix.
CRITICAL findings must be fixed before any lower-severity work. LOW and INFO findings are
included in the fix pass but may be deferred if the implementation agent judges them out of
scope — they must explicitly acknowledge each one.

Run fix agents in parallel where findings affect different domains (API vs frontend).

#### Phase 4 — QA verification
Spawn the `qa-engineer` agent to:
- Verify the original acceptance criteria are still met after the security fixes
- Confirm any test changes needed as a result of the security fixes are applied

#### Phase 5 — Final security review
Spawn the `security-engineer` agent again to re-review the same files. It must explicitly
confirm each original finding as resolved or still open. Any remaining HIGH or CRITICAL
findings block the workflow — surface them to the user before proceeding.

### 6. After the workflow completes
- Present a summary of all changes made, QA results, and security findings (before and after)
- Start the full application locally so the user can review the running changes:
  ```bash
  docker compose up -d db
  dotnet run --project src/api &
  cd src/web && npm run dev &
  ```
- Inform the user that:
  - The API is running at `http://localhost:5000` (Scalar API docs at `/scalar/v1`)
  - The web app is running at `http://localhost:3000`
- Ask the user to review the running application and explicitly approve before proceeding
- **Only after user approval**: commit all changes with a clear commit message referencing the issue number
- **Only after user approval**: push the branch and create a pull request via `gh pr create`
- Never commit, push, or create a PR without explicit user approval
