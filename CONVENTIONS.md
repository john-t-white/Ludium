# Working Conventions

## What Ludium Is

Ludium is a board-game shelf and matching app — not a review site. Play logs
capture how a game actually felt at the table, and that signal drives
matches: to similar games, and to other people who felt the same way about
them. There's no in-app buying or selling, just connecting. Importing a
collection from BoardGameGeek (BGG) runs in the background from "the Shelf,"
not as a blocking step during onboarding.

## What We're Building, and In What Order

GitHub Milestones are the project's phases, and GitHub Issues are the work
items within them — see the repo's Milestones and Issues tabs on GitHub for
the current roadmap and what's actively planned. Only the next phase gets
detailed into issues at a time; later phases are named as milestones but not
broken into issues until their turn comes. This document intentionally
doesn't restate that state, since it changes with every issue closed —
GitHub is the source of truth for what's in progress.

## How Work Is Planned, Sized, and Reviewed

**Issues are the spec.** Work is decomposed into self-contained GitHub
issues, each with a Description, a checklist of verifiable Acceptance
Criteria, an explicit Out of Scope section, and a Depends On section where
relevant. An issue is the contract between "what to build" and "how we know
it's done" — it should stand on its own without needing a separate plan doc
for context. Issue and milestone descriptions stay high-level and
non-technical (no file paths, library choices, or config values); those
implementation decisions belong in the plan written for that issue, not in
the issue itself. Milestones carry their own phase-level acceptance
checklist, the same way an issue does.

**Work proceeds incrementally.** Only the next small slice of work is
planned and turned into issues at a time — the backlog is not front-loaded
into a large batch of issues up front. Every issue gets an explicit
plan-before-implement step: propose the approach and get it approved before
any code is written. Use plan mode for interactive sessions; a CI-triggered
agent must post its plan and wait for approval before writing code.

**Pull requests stay small.** An issue that would produce a large diff is
split into multiple smaller PRs rather than landed as one big change, so
review stays manageable.

**Pull requests are reviewed by a multi-agent process, then a human.** Once
a PR is open, an automated review runs four agents in parallel — verifying
the PR's test plan, verifying the linked issue's acceptance criteria, a
general code review, and a security review — and posts findings as inline
PR comments, each attributed to the agent that raised it. This review never
approves or merges on its own; a human reads the findings, responds inline,
decides what to act on, and makes the merge call. Once changes land in
response to feedback, the same agents review again — and each renders an
explicit resolve / don't-resolve verdict on the threads it owns, rather
than the orchestrating process inferring resolution on their behalf. As the
project moves toward a more fully agentic workflow, this process may be
formalized into dedicated review agents.

## See Also

- [design/](design/) — the approved visual design reference (mockups, brand
  assets).
- [README.md](README.md) — project overview for newcomers.
