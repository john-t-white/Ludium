---
name: pr-review
description: Run one round of Ludium's multi-agent pull request review — establish thread state deterministically, dispatch the four review agents, confirm each round posted, and report what is still open. Use when asked to review a pull request in this repository, or to re-review one after fixes have landed.
---

# Running a review round

One round of the review `CONVENTIONS.md` describes: the four agents in
`.claude/agents/` look at a pull request, each posts its own findings, and each
renders its own verdict on the threads it owns. Run this again after fixes land
— it performs a re-review round, not a fresh review.

The agent definitions say who reviews and what they look for, and `REVIEW.md`
says what to flag and how much. Neither is restated here. This file is only the
loop around them.

## 1. Establish the state

    node tools/review-state/review-state.mjs --pr <number>

Without `--pr`, the pull request for the current branch is used.

This report is the authority on what round each agent is on, which threads are
open, who owns each, and who owes a verdict. **Do not re-derive any of it by
reading the pull request** — that is the work this step exists to replace, and
an agent working it out costs several calls a round and can get it wrong.

Read the report and nothing else at this stage. It also groups threads two
agents raised on the same problem, so a pair is handled as a pair.

## 2. Dispatch the four agents

Spawn all four in parallel, one Agent call each, in a single message:
`review-acceptance-criteria`, `review-code`, `review-security`,
`review-test-plan`.

Give each a dispatch carrying only what it cannot get from its own definition:

- The pull request number, and the head commit the report named.
- **Its round number**, from the report. A round above 1 is a re-review: the
  agent's own file tells it that only blocking findings are raised on material
  already seen, and that material a fix newly added gets a first-round review.
- **Every unresolved thread it owns** — thread id, first comment id, and what
  the finding was about — and which of those it owes a verdict on. An agent
  owes a verdict on each of its open threads; the report says which are
  outstanding for this round.
- Anything about the change the agent could not otherwise know: which of a
  split issue's pull requests this is, or that a recommendation it made was
  tried and failed, and why.

Do not restate what the agent's file already says, and do not tell an agent
what to conclude. Each agent posts its own findings, replies and resolutions
itself; nothing is transcribed on its behalf.

An agent whose territory the round cannot have touched may be left out — but
say so in the report, because a round nobody ran and a round that found nothing
look identical afterwards.

## 3. Confirm each round posted

Re-run the state command. Each dispatched agent's next-round number must have
gone up by one; that is what proves its review reached the pull request.

An agent that returned findings to you but whose round did not advance **did
not post**, and its findings exist nowhere but in its reply to you. This has
happened. Dispatch that agent once more, telling it its previous round did not
post and to check the API call succeeded. If it fails again, say so in the
report and quote what it found, rather than letting a silent failure read as a
clean round.

## 4. Report

From the final state report, tell the human:

- Which threads are still open, who owns each, and what each owner is waiting
  for. Threads on one problem are reported together, as the state command
  groups them.
- Which verdicts are still owed, and by whom.
- What this round found overall, and anything an agent flagged that has no
  thread of its own.

**The loop has ended** when no thread is open and the latest round raised
nothing blocking. Say so plainly: that is the review finishing, not a step
being skipped.

Then stop. This command never approves, never merges, and never ticks an
acceptance criterion. A human reads the findings, decides what to act on, and
makes the merge call.
