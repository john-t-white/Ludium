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
plan rather than implying an order that didn't happen. Every pull request
carries a test plan, including one whose change has nothing to run — that
plan says so, and says what was checked instead.

**Pull requests stay small.** An issue that would produce a large diff is
split into multiple smaller PRs rather than landed as one big change, so
review stays manageable. Those PRs land one at a time, each branched from
`main` after the previous one merged, rather than stacked on one another —
`main` squashes on merge, so a branch built on an unmerged PR carries
commits that cease to exist once that PR lands, and the conflicts that
follow are noise rather than real disagreement.

**Pull request descriptions say only what's new.** A description gives what
the issue and the diff do not already say: what changed, any judgement call
a reader could not infer, and the test plan required above. It does not
restate the issue, re-quote acceptance criteria, or summarize the diff.

**Pull requests are reviewed by a multi-agent process, then a human.** Once
a PR is open, an automated review runs four agents in parallel — verifying
the PR's test plan, verifying the linked issue's acceptance criteria, a
general code review, and a security review. Each posts its own findings as
inline PR comments under its own name, so a finding reads as the agent that
raised it wrote it. The four run as subagents spawned for the purpose, from
checked-in definitions in [.claude/agents/](.claude/agents/) — one file per
agent, and the source of truth for what each reads and what it looks for,
within the calibration `REVIEW.md` sets. An agent file holds that judgment and
nothing else: how a finding is filed is the same for all four, so it is written
once in `REVIEW.md` and enforced by [tools/review-post/](tools/review-post/),
the one command an agent posts a round with. The name prefix, the severity
tag, and the link that pairs two threads on one problem are written by that
command, and it refuses a finding with no anchor, because every one of those
was a rule in prose that an agent broke at least once. This document
says why the review works the way it does; those files and that command are what
actually runs, so a change to how a review runs is a change to them. Each
agent runs at a capability level matched to its job, recorded in its
frontmatter. What a review flags, at what severity, how much of it, and how a
finding is filed is calibration rather than process, and it lives in
[REVIEW.md](REVIEW.md), which a review reads and nothing else does. The three
files divide cleanly: `CLAUDE.md` is context for all work, this document is
how work is planned and reviewed and why, and `REVIEW.md` is what a review
does with the change in front of it.
This review never approves or merges on its own; a human reads the findings,
responds inline, decides what to act on, and makes the merge call.

**A round runs as one command.** The loop the review runs — who looks, in what
order, and what has to happen before a reviewer is asked again — is stated in
[.claude/skills/pr-review/](.claude/skills/pr-review/), which is also what
runs it: dispatching the agents, telling each what round it is on and which of
its threads are open, checking that each round actually posted, and reporting
what is left. Running that command is what a review round is. Assembling that
loop by hand each time made two runs of "the same" review not the same review,
which is the problem the checked-in agent definitions already solved for the
agents themselves. The parts of a round that are facts rather than judgments —
who owns a thread, which are unresolved, who still owes a verdict, what round
each agent is on — are settled by [tools/review-state/](tools/review-state/)
before any agent runs, because an agent working them out spends calls on it
every round and can get it wrong, while a check returns the same answer every
time. What the round then owed is checked by that same tool rather than read
for: an agent that did not post, a thread its owner left unverdicted, a
finding with no anchor, a round over the minor-findings cap, and a minor
finding raised after round one each fail a check that exits non-zero. Every
one of those was a rule that lived in prose and was broken while it did. As
with the agent files, this document says why; the skill is what runs.

**A finding gets one thread.** A finding stays on the thread it was first
raised on, from that first raise until it is resolved. A follow-up about
that same finding — the fix is wrong, or incomplete, or raises a new
question about the problem the thread already holds — is a reply on that
thread, not a new one; a separate problem the fix introduced is a finding in
its own right, and gets its own thread. An agent that independently finds a
problem another agent has already raised files its own thread for it —
saying what it found and what would satisfy it — rather than letting its
concern be settled by another agent's verdict: two agents often care about the
same problem for different reasons, and each reason has its own test for
"fixed". Two threads on one problem is the cost of keeping each concern
independently answerable: every thread has exactly one owning agent, and a fix
that satisfies one agent's thread leaves the other's open until that agent says
so itself. This decides whose thread a concern goes on, not whether the concern
clears the bar of the round it is found in — one that does not clear that bar
is not raised by anyone, which is the bar working rather than an agent
deferring.

**The review loop ends.** Once changes land in response to feedback, the
same agents review again — and each renders an explicit resolve /
don't-resolve verdict on the threads it owns, rather than the orchestrating
process inferring resolution on their behalf. A thread that closes, by
verdict or by any of the routes below, is marked resolved on the pull
request, so the threads left open are the unfinished ones. Each such pass is
a round, and from the second one on, agents raise only findings that would
block merging — ones the agent would not merge without — on everything that
round sees, including material a fix newly added, so a fix cannot pull the
review back into a fresh round of minor findings. Exempting new material is
what made that bar unenforceable: every fix is new material, so every fix
earned a fresh round of nits, which is how a 280-line change reached round
seven. The posting command now refuses a minor finding after round one, so the
bar holds without being remembered. That a fix falls short of the finding its
thread already holds is always said, but it keeps the thread open only if the
shortfall would itself block merging. A thread can also close without a
resolve verdict: the human declines the finding, or its owning agent
withdraws it, or that agent will not run again and the human closes it. The
loop ends when no thread is open and the latest round raised nothing
blocking — that is the review finishing, not a step being skipped.

**A finding is three parts.** What is wrong, what it causes where an example
clarifies it, and a recommendation, kept short: volume buries the thing the
reader has to act on.

**Acceptance criteria are checked off when the pull request merges.** Not
when a review agent verifies them and not while review is still running: a
box ticked earlier records work that can still change.

## Toolchains

Toolchains are pinned to release builds, and one that accepts prereleases
by default is configured to refuse them explicitly rather than left to that
default holding. The .NET SDK is such a toolchain, which is why `global.json`
sets `allowPrerelease` to false.

## See Also

- [design/](design/) — the approved visual design reference (mockups, brand
  assets).
- [REVIEW.md](REVIEW.md) — review calibration: what a review flags, at what
  severity, and how much of it.
- [README.md](README.md) — project overview for newcomers.
