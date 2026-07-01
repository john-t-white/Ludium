# Workflow

Every request that involves code changes follows four phases in order. **All four phases are mandatory — do not skip, reorder, or rationalize skipping any phase, even when the requirements appear clear or the change seems small.**

## Tier Definitions

Before any phase begins, the lead classifies the change into one of three tiers. The tier governs which agents are spawned and which review steps apply. **Default to Standard when the tier is unclear. Escalate to Full if a Full-tier condition is discovered during analysis.**

| Tier | Conditions (all must hold for Micro/Standard; any one triggers Full) |
|---|---|
| **Micro** | Single area affected; no API contract changes; no schema changes; no infra changes; ~200 lines or fewer |
| **Standard** | ≤2 areas affected; additive-only API changes (no breaking changes); no schema changes; no infra changes |
| **Full** | 3+ areas; schema changes; infra changes; breaking API changes; or security-sensitive changes (auth, permissions, secrets) |

| Tier | Dev Team spawned | Plan QA (Phase 2) | Implementation QA (Phase 4 Pass 2) |
|---|---|---|---|
| **Micro** | Affected area(s) + test-dev | None | quality-reviewer + ac-reviewer |
| **Standard** | Affected area(s) + test-dev | security-reviewer + quality-reviewer | quality-reviewer + test-reviewer + ac-reviewer |
| **Full** | All affected area(s) + test-dev | All 5 reviewers | All 4 reviewers |

## Phase 1 — Requirements Analysis

1. Lead runs `git fetch origin && git checkout main && git pull origin main` to ensure the team is analysing the latest code.
2. Lead determines the **tier** (Micro / Standard / Full) based on the request, then spawns only the Dev Team members whose owned area is affected, per `dev-team.md`'s "Typical change → spawn" table. Refer to the Tier Definitions table above for scoping guidance. Always include `test-dev` when `frontend-dev` or `backend-dev` is spawned.

   ```text
   Spawn only the affected Dev Team members per dev-team.md's "Typical change → spawn" table.
   Example for a frontend-only change: frontend-dev (nextjs-frontend, owns src/web/) +
   test-dev (qa-engineer, owns src/api.integration-tests/ and src/web/e2e/).

   All teammates use the leader's model. No teammate may edit files outside their owned area.
   Any teammate whose area has no affected files must send "[name]: Area unaffected — no action needed." immediately and stop.
   ```

3. Each Dev Team member reads the requirements and the relevant areas of the codebase from their perspective.
4. Dev Team members communicate with each other to identify gaps, ambiguities, and cross-area dependencies.
5. Dev Team formulates clarifying questions. **Every question must include a suggested answer or default.** Do not assume and proceed — present suggestions and wait for user confirmation.
6. Lead consolidates all clarifying questions and suggestions and presents them to the user in a single grouped list.
7. User confirms, adjusts, or overrides the suggestions.

## Phase 2 — Planning

1. Dev Team creates a detailed implementation plan based on the clarified requirements: which files change, what the change is, and the order of operations with cross-area dependencies mapped.
2. Lead spawns QA reviewers based on the tier:

   **Micro tier — skip QA plan review entirely.** Proceed directly to user approval.

   **Standard and Full tiers:**
   ```text
   Spawn the QA Team to review the implementation plan: for this tier, spawn each reviewer
   listed in the "Plan QA" column of the Tier Definitions table above, using the agent type
   and model from qa-team.md's Team Members table. Each reviewer assesses the plan (not code)
   through its lens from that table and reports findings to the lead.
   Reviewers may read any file but must not modify code.
   ```

4. QA Team returns plan findings to the lead.
5. Lead incorporates any blocking plan concerns — routing back to the relevant Dev Team member to revise the plan — then presents a concise plan summary to the user:
   - What will change and why
   - Which team members are involved and what they will do
   - Any risks or trade-offs flagged by the QA Team
6. **User must explicitly approve the plan before implementation begins. Do not proceed without approval — no exceptions.**

## Phase 3 — Implementation

1. Lead creates and checks out the feature branch from `main` (unless the user specified a different base).
2. Dev Team members claim their tasks and implement within their owned areas.
3. Teammates communicate directly when a change in one area requires a coordinating change in another.
4. Lead monitors progress and resolves blockers.

## Phase 4 — Implementation Review

Implementation review runs in two passes to prevent secrets from ever reaching git history.

### Pass 1 — Security review (pre-push)

1. Dev Team signals completion to the lead.
2. Lead spawns `security-reviewer` to review the local branch diff before anything is pushed:

   ```text
   Spawn security-reviewer using the security-engineer agent type to review the local branch
   before it is pushed. The branch has NOT been pushed — do not post PR comments. Report all
   findings directly to the lead. May read any file but must not modify code.

   Scope: this pass checks ONLY for secrets that would reach git history. Do not perform a
   general vulnerability/OWASP review here — that happens post-push in Pass 2.

   Invoke the `scan-secrets` skill and inspect every match in context. Any real credential
   (not a placeholder, an env var reference like $SECRET, or a test fixture) is BLOCKING and
   must be removed before push.
   ```

3. `security-reviewer` reports findings directly to the lead. No PR exists yet — no inline comments.
4. If there are blocking findings: lead routes them to the responsible Dev Team member, who fixes and re-commits locally. `security-reviewer` re-reviews. Repeat until security clears.

### Pass 2 — Full review (post-push)

5. Once security clears, lead pushes the branch and opens the pull request.
6. Lead spawns QA reviewers based on the tier:

   ```text
   Spawn the QA Team to review all changes implemented by the Dev Team (PR #{number}):
   spawn each reviewer listed in the "Implementation QA" column of the Tier Definitions table
   above, using the agent type from qa-team.md's Team Members table. Each reviewer assesses the
   pushed PR through its lens from that table. quality-reviewer additionally verifies all unit
   tests written by frontend-dev and backend-dev pass and that code coverage is adequate.
   test-reviewer additionally invokes the `run-tests` skill and posts the summary via
   `post-pr-summary`.
   Reviewers may read any file but must not modify code.
   Post every finding (blocking and non-blocking) as an inline PR comment using the
   `post-review-finding` skill.
   ```

7. Reviewers post every finding as an inline PR comment using the `post-review-finding` skill, attributed to the reviewer agent name.
8. Lead routes blocking findings to the responsible Dev Team member, who fixes and pushes. After pushing, the Dev Team member posts an in-thread reply on the finding's review thread describing what was changed, using the `post-fix-reply` skill.
9. The original reviewing agent re-reads the changed code. If the fix is satisfactory, it posts an in-thread reply confirming the fix using the `post-verified-reply` skill, then resolves the thread using `pr-thread-list` (to find the thread's node ID) followed by `pr-thread-resolve`.
   If the fix introduces a new issue or is incomplete, the reviewer posts a new blocking comment on the relevant line (`post-review-finding`) and the cycle continues.
10. Steps 8–9 repeat until all blocking threads are resolved.
11. If any reviewer identifies a new blocking issue at any point during the fix cycle — including while verifying another finding — they post a new inline comment and it enters the same loop.
12. If a reviewer spots an issue that was not introduced by the current changes or falls outside the acceptance criteria, they do not post a blocking comment. Instead, they report it to the lead, who asks the user: should this be tracked as a new GitHub issue or handled in this PR? The user's answer determines whether a new issue is created or the finding enters the blocking loop.
13. PR is ready to merge only when there are no open blocking threads.

### PR comment and thread mechanics

The exact commands for posting findings, fix replies, verified replies, and resolving threads
live in `.claude/skills/`: `post-review-finding`, `post-fix-reply`, `post-verified-reply`,
`pr-thread-list`, `pr-thread-resolve`.
