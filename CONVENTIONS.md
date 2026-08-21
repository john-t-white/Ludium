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

**Settled decisions go in Developer Notes.** Some technical decisions get
made before an issue is written — usually while planning the phase — and
re-deciding them once per issue wastes the plan-before-implement step. An
issue may carry a Developer Notes section recording those decisions and why
they were made. This is the one place technical specifics belong in an
issue, and it exists to close questions rather than open them: everything
above it stays high-level, and the implementation plan restates and
justifies each note rather than treating it as unquestionable. A decision
that has not actually been settled does not belong here.

**Work proceeds incrementally.** Only the next small slice of work is
planned and turned into issues at a time — the backlog is not front-loaded
into a large batch of issues up front. Every issue gets an explicit
plan-before-implement step: propose the approach and get it approved before
any code is written. Use plan mode for interactive sessions; a CI-triggered
agent must post its plan and wait for approval before writing code.

**Tests come first.** Backend work follows red-green-refactor: the failing
test is written before the code that satisfies it, and the pull request's test
plan records having seen it fail. Writing the test first is what forces the
change to be stated as observable behaviour rather than as an implementation,
and it is the only way to know the test can actually fail. Where the behaviour
already exists and a test is being added after the fact, say so in the test
plan rather than implying an order that didn't happen.

**Pull requests stay small.** An issue that would produce a large diff is
split into multiple smaller PRs rather than landed as one big change, so
review stays manageable.

**Pull requests are reviewed by a multi-agent process, then a human.** Once
a PR is open, an automated review runs four agents in parallel — verifying
the PR's test plan, verifying the linked issue's acceptance criteria, a
general code review, and a security review — and posts findings as inline
PR comments, each attributed to the agent that raised it. This review never
approves or merges on its own; a human reads the findings, responds inline,
decides what to act on, and makes the merge call. As the project moves
toward a more fully agentic workflow, this process may be formalized into
dedicated review agents.

**A finding gets one thread.** A finding stays on the thread it was first
raised on, from that first raise until it is resolved. A follow-up about
that same finding — the fix is wrong, or incomplete, or raises a new
question about the problem the thread already holds — is a reply on that
thread, not a new one; a separate problem the fix introduced is a finding
in its own right, and gets its own thread. An agent that independently
finds a problem another agent has already raised joins that thread, saying
what it found and what would satisfy it, rather than filing a duplicate or
staying silent: two agents often care about the same problem for different
reasons, and each reason has its own test for "fixed". A thread can
therefore have more than one owning agent, and closing it takes a verdict
from each of them.

**The review loop ends.** Once changes land in response to feedback, the
same agents review again — and each renders an explicit resolve /
don't-resolve verdict on the threads it owns, rather than the orchestrating
process inferring resolution on their behalf. Each such pass is a round,
and from the second one on, agents raise only findings that would block
merging — ones the agent would not merge without — whether by opening a
thread or by joining one, so a fix cannot pull the review back into a fresh
round of minor findings. That a fix falls short of the finding its thread
already holds is always said, but it keeps the thread open only if the
shortfall would itself block merging. A thread can also close without a
resolve verdict. The human declining a finding closes its thread outright.
An agent withdrawing its own finding, or the human closing out an owner
that will not run again, ends that agent's ownership rather than the
thread, which closes once no owning agent is left waiting on it. The loop
ends when no thread is open and the latest round raised nothing blocking —
that is the review finishing, not a step being skipped.

## See Also

- [design/](design/) — the approved visual design reference (mockups, brand
  assets).
- [README.md](README.md) — project overview for newcomers.
