# Workflow

Every request that involves code changes follows four phases in order. **All four phases are mandatory — do not skip, reorder, or rationalize skipping any phase, even when the requirements appear clear or the change seems small.**

## Phase 1 — Requirements Analysis

1. Lead receives a feature or bug request and spawns the Dev Team:

   ```text
   Spawn the Dev Team:
   - frontend-dev using the nextjs-frontend agent type to own src/web/
   - backend-dev using the dotnet-api agent type to own src/api/
   - db-dev using the postgresql-developer agent type to own src/db/
   - infra-dev using the terraform-engineer agent type to own infra/
   - ci-dev using the github-actions-engineer agent type to own .github/
   - test-dev using the qa-engineer agent type to own src/api.integration-tests/ and src/web/e2e/
   All teammates use the leader's model. No teammate may edit files outside their owned area.
   ```

2. Each Dev Team member reads the requirements and the relevant areas of the codebase from their perspective.
3. Dev Team members communicate with each other to identify gaps, ambiguities, and cross-area dependencies.
4. Dev Team formulates clarifying questions. **Every question must include a suggested answer or default.** Do not assume and proceed — present suggestions and wait for user confirmation.
5. Lead consolidates all clarifying questions and suggestions and presents them to the user in a single grouped list.
6. User confirms, adjusts, or overrides the suggestions.

## Phase 2 — Planning

1. Lead runs `git fetch origin && git checkout main && git pull origin main` to ensure the team is planning against the latest code.
2. Dev Team creates a detailed implementation plan based on the clarified requirements: which files change, what the change is, and the order of operations with cross-area dependencies mapped.
3. Lead spawns the QA Team to review the plan:

   ```text
   Spawn the QA Team to review the implementation plan:
   - security-reviewer using the security-engineer agent type to identify security risks in the proposed approach
   - quality-reviewer using the quality-reviewer agent type to flag correctness issues, logic gaps, missing edge case handling, and whether the plan includes unit tests for all frontend and backend code
   - test-reviewer using the qa-engineer agent type to assess whether the plan includes sufficient test coverage
   - performance-reviewer using the performance-reviewer agent type to identify performance or scalability risks in the proposed design
   - ac-reviewer using the ac-reviewer agent type to verify the plan fully addresses all acceptance criteria and requirements
   Reviewers may read any file but must not modify code. All teammates use the leader's model.
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

   Step 1 — Scan the diff for secret patterns.
   Run the following and inspect every match in context:

     git diff main..HEAD | grep -inE \
       "password\s*=|passwd\s*=|secret\s*=|api_key\s*=|apikey\s*=|access_key\s*=|auth_token\s*=|bearer\s+[a-z0-9]{8,}|token\s*=|private_key\s*=|-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}"

   Any match that is a real credential (not a placeholder like "your-secret-here", an env var
   reference like $SECRET, or a test fixture) is an automatic BLOCKING finding.

   Step 2 — Inspect high-risk file types added or modified in the diff.
   Run `git diff main..HEAD --name-only` and read the full content of any file matching:
     .env, .env.*, *.pem, *.key, *.p12, *.pfx, *.jks,
     appsettings*.json, secrets.json, *credentials*, *secret*

   For each: confirm all sensitive fields are env var references or placeholders, not real values.

   Step 3 — Full security review.
   Read each changed file (git diff main..HEAD --name-only) in full and review for
   vulnerabilities, auth issues, and OWASP top 10 beyond secrets.

   Any real secret found in Steps 1 or 2 is BLOCKING and must be removed before push.
   ```

3. `security-reviewer` reports findings directly to the lead. No PR exists yet — no inline comments.
4. If there are blocking findings: lead routes them to the responsible Dev Team member, who fixes and re-commits locally. `security-reviewer` re-reviews. Repeat until security clears.

### Pass 2 — Full review (post-push)

5. Once security clears, lead pushes the branch and opens the pull request.
6. Lead spawns the remaining QA reviewers with the PR number:

   ```text
   Spawn the QA Team to review all changes implemented by the Dev Team (PR #{number}):
   - quality-reviewer using the quality-reviewer agent type to review for bugs, logic errors, and code correctness; verify all unit tests written by frontend-dev and backend-dev pass and that code coverage is adequate for the changes made
   - test-reviewer using the qa-engineer agent type to review test coverage and test quality; run all available local tests (`dotnet test src/api.unit-tests`, `dotnet test src/api.integration-tests`, `npm test` in `src/web/` if applicable) and post a pass/fail summary as a PR comment
   - performance-reviewer using the performance-reviewer agent type to review for bottlenecks, inefficiencies, and scalability concerns
   - ac-reviewer using the ac-reviewer agent type to verify all acceptance criteria and requirements are met by the implementation
   Reviewers may read any file but must not modify code. All teammates use the leader's model.
   Post every finding (blocking and non-blocking) as an inline PR comment on the specific line using the instructions in the Posting and Resolving PR Comments section of .claude/workflow.md.
   ```

7. Reviewers post every finding as an inline PR comment on the specific line, attributed to the reviewer agent name.
8. Lead routes blocking findings to the responsible Dev Team member, who fixes and pushes.
9. The original reviewing agent re-reads the changed code. If the fix is satisfactory, it resolves the thread. If the fix introduces a new issue or is incomplete, the reviewer posts a new blocking comment on the relevant line and the cycle continues.
10. Steps 8–9 repeat until all blocking threads are resolved.
11. If any reviewer identifies a new blocking issue at any point during the fix cycle — including while verifying another finding — they post a new inline comment and it enters the same loop.
12. If a reviewer spots an issue that was not introduced by the current changes or falls outside the acceptance criteria, they do not post a blocking comment. Instead, they report it to the lead, who asks the user: should this be tracked as a new GitHub issue or handled in this PR? The user's answer determines whether a new issue is created or the finding enters the blocking loop.
13. PR is ready to merge only when there are no open blocking threads.

### Posting an inline PR comment

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
COMMIT_SHA=$(gh pr view {PR_NUMBER} --json headRefOid --jq '.headRefOid')

gh api repos/$REPO/pulls/{PR_NUMBER}/comments \
  --method POST \
  --field body="**[{agent-name}] {BLOCKING|NON-BLOCKING}:** {finding description}" \
  --field commit_id="$COMMIT_SHA" \
  --field path="{relative/path/to/file}" \
  --field line={line_number} \
  --field side="RIGHT"
```

Use `side="RIGHT"` for added/unchanged lines (the "after" side). Use `side="LEFT"` only for lines removed in the diff.

### Resolving a thread after a fix is verified

After the Dev Team member pushes a fix, the original reviewing agent re-reads the changed file, confirms the issue is resolved, then:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
OWNER=$(echo $REPO | cut -d/ -f1)
REPO_NAME=$(echo $REPO | cut -d/ -f2)

# 1. List open threads and find the matching one by path/body
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { body path line }
          }
        }
      }
    }
  }
}' -f owner="$OWNER" -f repo="$REPO_NAME" -F pr={PR_NUMBER}

# 2. Resolve the thread using the node ID returned above
gh api graphql -f query='
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread { isResolved }
  }
}' -f threadId="{THREAD_NODE_ID}"
```
