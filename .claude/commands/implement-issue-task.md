# Implement GitHub Issue Task

You are an implementation assistant for the **Ludium** project. Your job is to implement the next incomplete task on a GitHub issue, using a coding agent to implement it and a review agent to verify it before marking it done.

## Starting point

The user has provided a GitHub issue number: **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask the user which issue number they want to implement before proceeding.

---

## Phase 1 — Load the Issue and Find the Next Task

Fetch the issue:

```bash
gh issue view $ARGUMENTS --repo john-t-white/Ludium --json number,title,body
```

Parse the **Technical Plan** section from the body. Find the **first** task marked incomplete:
- `- [ ] TXXX ...` — incomplete
- `- [x] TXXX ...` — already complete (skip)

If the issue has no **Technical Plan** section, or the Technical Plan contains no tasks at all, stop and tell the user:

> This issue has no technical plan yet. Run `/plan-issue $ARGUMENTS` first to generate one before implementing.

If all tasks are already marked complete, stop and tell the user:

> All tasks on issue #$ARGUMENTS are already complete.

Otherwise, display the issue title, the task you are about to implement, and the overall progress (e.g. "Task T002 — 1 of 4 remaining"), then ask the user to confirm before starting.

---

## Phase 2 — Implement the Task

### Step 0 — Create the Task Branch

Create and check out a branch for this task:

```bash
git checkout main && git pull origin main
git checkout -b feature/$ARGUMENTS-TXXX
```

Replace `TXXX` with the actual task ID (e.g., `T001`). Confirm the active branch is `feature/$ARGUMENTS-TXXX` before proceeding. Do not implement anything on `main`.

### Step 1 — Coding Agent

Spawn a **coding agent** (using the Agent tool) with the following prompt, substituting the real values:

> You are implementing a task for the Ludium project (a social web platform for tabletop board games built with Next.js + TypeScript frontend at `src/web/` and a .NET 10 C# backend at `src/api/`).
>
> **Issue:** [issue title]
> **Full issue body for context:** [full issue body]
>
> **Task to implement:** [TXXX] [task description]
>
> Instructions:
> 1. Read the relevant existing code to understand what's already in place before making any changes.
> 2. Implement the task completely — make all necessary file edits, create any new files, and install any new dependencies.
> 3. Follow the project's existing conventions: tabs for indentation, TypeScript (no plain `.js`), file-scoped namespaces in C#, nullable reference types enabled.
> 4. After implementing, verify the project builds successfully:
>    - For .NET changes: run `dotnet build` from `src/api/`
>    - For Next.js changes: run `npm run build` from `src/web/`
>    - Fix any build errors before reporting back.
> 5. Ensure the code is in a runnable state for anyone who checks out the branch:
>    - All new dependencies must be committed (`.csproj` references, `package.json`, `package-lock.json`)
>    - No hardcoded machine-specific paths or local-only configuration
>    - If the task requires new environment variables or secrets, document the setup in `CLAUDE.md` or the relevant `README`
> 6. When finished, report back with: (a) a summary of every file you created or changed and what you did, (b) the build command(s) you ran and whether they succeeded, (c) any assumptions you made, and (d) anything specific the reviewer should look at closely.

Wait for the coding agent to finish and capture its report.

### Step 2 — Commit and Open PR

After the coding agent finishes, commit all changes and ensure a PR is open for this task branch.

**Commit the changes:**

```bash
git add -A
git commit -m "$(cat <<'EOF'
[TXXX] Brief description of what was done

Implements task TXXX from issue #$ARGUMENTS.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Use the task ID and a concise summary of what was implemented as the commit message subject.

**Open a PR if one is not already open:**

```bash
gh pr view feature/$ARGUMENTS-TXXX --repo john-t-white/Ludium --json number 2>/dev/null
```

If no PR exists, create one using the coding agent's report to populate the body:

```bash
gh pr create \
  --repo john-t-white/Ludium \
  --head feature/$ARGUMENTS-TXXX \
  --base main \
  --title "[TXXX] task description" \
  --body "$(cat <<'EOF'
Implements [TXXX] from issue #$ARGUMENTS.

## Summary
[1–3 sentence summary of what was done, drawn from the coding agent's report]

## Changes
[bullet list of files created or modified, with a one-line description of each, drawn from the coding agent's report]

## Assumptions
[bullet list of any assumptions the coding agent noted; omit this section if there were none]
EOF
)"
```

Capture the PR number — it is required for all subsequent steps.

### Step 3 — Review Agent

Spawn a **review agent** (using the Agent tool) with the following prompt:

> You are reviewing a code change for the Ludium project (Next.js + TypeScript frontend at `src/web/`, .NET 10 C# backend at `src/api/`).
>
> **Issue:** [issue title]
> **Task that was implemented:** [TXXX] [task description]
> **PR number:** [PR number]
> **Review context:** [one of: "Initial review — no changes have been requested yet." OR "Re-review after fixes — the following issues were previously raised and addressed: [list of resolved issues]"]
>
> **Coding agent's report:**
> [paste the coding agent's report]
>
> Instructions:
> 1. Run `git diff main` to see the actual changes made.
> 2. Read any new or modified files the coding agent mentioned.
> 3. Verify the task is **fully and correctly** implemented — not just partially started.
> 4. Check that code follows project conventions: tabs for indentation, TypeScript (no plain `.js`), file-scoped namespaces in C#, nullable reference types enabled, no unnecessary comments.
> 5. Verify the code is in a runnable state — someone should be able to check out this branch and run it without any extra steps beyond what is already documented:
>    - Run the relevant build command (`dotnet build` from `src/api/` and/or `npm run build` from `src/web/`) and confirm it succeeds
>    - Check that any new dependencies are committed (`.csproj` references, `package.json`, `package-lock.json`)
>    - Check for hardcoded paths or machine-specific values that would break on another machine
>    - If new environment variables or secrets are required, confirm they are documented
> 6. Check for bugs, missing edge cases, or anything that would prevent the acceptance criteria for this task from being met.
> 6. If you find issues, post each one as a **separate PR comment** before responding, like this:
>    ```bash
>    gh pr comment [PR number] --repo john-t-white/Ludium --body "**Review Issue N:** <description of the issue and what needs to change>"
>    ```
>    After posting, retrieve the comment IDs you just created:
>    ```bash
>    gh api repos/john-t-white/Ludium/issues/[PR number]/comments --jq '.[-N:] | .[] | {id, body}'
>    ```
>    (where N is the number of issues you posted)
>
> Respond with either:
> - **APPROVED** — if the task is complete and the code is correct. Before responding, post an approval comment on the PR. Use the review context to choose the message:
>   - If this is the initial review: `✅ **Review approved** — no changes requested. [one-sentence summary of what was done]`
>   - If this is a re-review after fixes: `✅ **Review approved** — all review issues resolved. [one-sentence summary of what was done]`
>   ```bash
>   gh pr comment [PR number] --repo john-t-white/Ludium --body "[chosen message]"
>   ```
>   Then respond with **APPROVED** followed by the same one-sentence summary.
> - **CHANGES REQUIRED** — followed by a numbered list of the issues you posted, each including its PR comment ID (e.g., `Issue 1 (comment #123456789): description`).

### Step 4 — Fix Loop

If the review agent responds with **CHANGES REQUIRED**, spawn a new **coding agent** with this prompt:

> You are fixing issues found during code review for the Ludium project.
>
> **Task:** [TXXX] [task description]
> **PR number:** [PR number]
>
> **Issues to fix (each with its PR comment ID):**
> [paste the numbered list from the review agent, including comment IDs]
>
> Instructions:
> 1. Fix each issue exactly as described. Do not make any other changes.
> 2. For each issue you fix, edit the original PR comment to mark it resolved and explain what you did:
>    ```bash
>    gh api repos/john-t-white/Ludium/issues/comments/[comment_id] \
>      --method PATCH \
>      -f body="~~**Review Issue N:** original description~~\n\n✅ **Resolved:** <what you did to fix it>"
>    ```
> 3. When done, report back summarising what you changed for each issue.

After the fix agent finishes, commit the changes:

```bash
git add -A
git commit -m "$(cat <<'EOF'
[TXXX] Address code review feedback

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Then return to **Step 3** with the updated fix agent report. Set the review context to: `"Re-review after fixes — the following issues were previously raised and addressed: [list of resolved issues from the fix agent's report]"`.

If after **3 fix attempts** the review agent still reports CHANGES REQUIRED, stop and surface the remaining issues to the user for guidance before continuing.

### Step 5 — Mark Complete

Once the review agent responds with **APPROVED**, mark the task complete in the GitHub issue.

Fetch the current issue body:

```bash
gh issue view $ARGUMENTS --repo john-t-white/Ludium --json body --jq '.body'
```

Replace `- [ ] TXXX task description` with `- [x] TXXX task description ([PR #NNN](https://github.com/john-t-white/Ludium/pull/NNN))` in the body, where NNN is the PR number, and update the issue:

```bash
gh issue edit $ARGUMENTS --repo john-t-white/Ludium --body "<updated body>"
```

Tell the user the task is complete and the PR is ready for review.

---

## Constraints

- Never mark a task complete without receiving **APPROVED** from the review agent
- Never commit directly to `main` — each task is implemented on its own `feature/{IssueId}-{TaskId}` branch (e.g., `feature/42-T001`)
- Do not push the PR branch or request review — leave that for the user
