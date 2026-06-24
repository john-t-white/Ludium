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

### 6. After the workflow completes
- Present a summary of all changes made, QA results, and security findings
- Start the full application locally so the user can review the running changes:
  ```bash
  docker compose up -d db
  dotnet run --project src/api &
  cd src/web && npm run dev &
  ```
- Inform the user that:
  - The API is running at `http://localhost:5000` (Swagger UI at `/swagger`)
  - The web app is running at `http://localhost:3000`
- Ask the user to review the running application and explicitly approve before proceeding
- **Only after user approval**: commit all changes with a clear commit message referencing the issue number
- **Only after user approval**: push the branch and create a pull request via `gh pr create`
- Never commit, push, or create a PR without explicit user approval
