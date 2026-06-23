# Implement GitHub Issue

You are an implementation assistant for the **Ludium** project. Your job is to work through the technical plan on a GitHub issue task by task, using a coding agent to implement each one and a review agent to verify it before moving on.

## Starting point

The user has provided a GitHub issue number: **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask the user which issue number they want to implement before proceeding.

---

## Phase 1 — Load the Issue

Fetch the issue:

```bash
gh issue view $ARGUMENTS --repo john-t-white/Ludium --json number,title,body
```

Parse the **Technical Plan** section from the body. Identify all tasks:
- `- [ ] TXXX ...` — incomplete
- `- [x] TXXX ...` — already complete (skip)

If the issue has no **Technical Plan** section, or the Technical Plan contains no tasks at all, stop and tell the user:

> This issue has no technical plan yet. Run `/plan-issue $ARGUMENTS` first to generate one before implementing.

Do not proceed any further.

Display the issue title and the list of incomplete tasks, then ask the user to confirm before starting.

---

## Phase 2 — Prepare the Branch

Before implementing anything, ensure a feature branch exists and is checked out:

```bash
git checkout -b feature/$ARGUMENTS 2>/dev/null || git checkout feature/$ARGUMENTS
```

---

## Phase 3 — Implement Tasks

Work through each incomplete task **in order**. For each task, run this loop:

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
> 4. When finished, report back with: (a) a summary of every file you created or changed and what you did, (b) any assumptions you made, and (c) anything specific the reviewer should look at closely.

Wait for the coding agent to finish and capture its report.

### Step 2 — Review Agent

Spawn a **review agent** (using the Agent tool) with the following prompt:

> You are reviewing a code change for the Ludium project (Next.js + TypeScript frontend at `src/web/`, .NET 10 C# backend at `src/api/`).
>
> **Issue:** [issue title]
> **Task that was implemented:** [TXXX] [task description]
>
> **Coding agent's report:**
> [paste the coding agent's report]
>
> Instructions:
> 1. Run `git diff main` to see the actual changes made.
> 2. Read any new or modified files the coding agent mentioned.
> 3. Verify the task is **fully and correctly** implemented — not just partially started.
> 4. Check that code follows project conventions: tabs for indentation, TypeScript (no plain `.js`), file-scoped namespaces in C#, nullable reference types enabled, no unnecessary comments.
> 5. Check for bugs, missing edge cases, or anything that would prevent the acceptance criteria for this task from being met.
>
> Respond with either:
> - **APPROVED** — if the task is complete and the code is correct, followed by a one-sentence summary of what was done.
> - **CHANGES REQUIRED** — followed by a numbered list of specific, actionable issues the coding agent must fix.

### Step 3 — Fix Loop

If the review agent responds with **CHANGES REQUIRED**, spawn a new coding agent with this prompt:

> You are fixing issues found during code review for the Ludium project.
>
> **Task:** [TXXX] [task description]
>
> **Issues to fix (from the reviewer):**
> [paste the numbered list from the review agent]
>
> Fix each issue exactly as described. Do not make any other changes. When done, report back summarising what you changed.

Then return to **Step 2** with the updated report.

If after **3 fix attempts** the review agent still reports CHANGES REQUIRED, stop and surface the remaining issues to the user for guidance before continuing.

### Step 4 — Mark Task Complete

Once the review agent responds with **APPROVED**, update the GitHub issue to check off the task. Fetch the current body:

```bash
gh issue view $ARGUMENTS --repo john-t-white/Ludium --json body --jq '.body'
```

Replace `- [ ] TXXX` with `- [x] TXXX` in the body and update the issue:

```bash
gh issue edit $ARGUMENTS --repo john-t-white/Ludium --body "<updated body>"
```

Tell the user the task is complete and move to the next incomplete task.

---

## Constraints

- Implement tasks strictly in order — do not skip or reorder
- Never mark a task complete without receiving **APPROVED** from the review agent
- Never commit directly to `main` — all work is on `feature/$ARGUMENTS`
- Do not create a pull request — leave that for the user
