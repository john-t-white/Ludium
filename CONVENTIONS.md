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
any code is written.

**Pull requests stay small.** An issue that would produce a large diff is
split into multiple smaller PRs rather than landed as one big change, so
review stays manageable.

## See Also

- [design/](design/) — the approved visual design reference (mockups, brand
  assets).
- [README.md](README.md) — project overview for newcomers.
