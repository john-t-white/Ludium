# Review Instructions

Calibration for a review of this repository: what to flag, at what severity,
how much of it, and what to leave alone. This file is read only by a review.
General project context lives in `CLAUDE.md`, and how work is planned and
reviewed lives in `CONVENTIONS.md`.

## What blocks a merge here

Most of this repository is documentation, configuration, and scaffolding. The
default review calibration targets production code, and applying it here is
what turns a one-line fix into round seven.

A finding is **blocking** (Important) only when one of these is true:

- The change does not do what it says, or breaks or regresses behaviour.
- It exposes a secret, or opens a path an attacker could take.
- It departs from a decision settled in the issue's Developer Notes without
  the pull request saying why.
- It leaves a stated acceptance criterion unmet, or does something the issue's
  Out of Scope section excludes.

Everything else is **minor** (Nit) at most: wording, naming, structure, style,
"this could be simpler", and problems that would only appear under a future
change nobody has asked for.

## Cap the minor findings

Post at most three minor findings per agent per round. Beyond three, say
"plus N similar" in that round's review body, with one line on what they were
about — summarized rather than silently dropped. A round with nothing blocking
leads with that.

## Do not report

- Anything the build already enforces: C# compiler and nullable warnings, the
  TypeScript compiler, and ESLint (`src/web/eslint.config.mjs`).
- Generated and vendored files: `src/web/node_modules/`, `bin/`, `obj/`,
  `package-lock.json`, and `src/web/next-env.d.ts`.
- Unmodified `create-next-app` scaffolding under `src/web/`.
- Pre-existing problems the diff merely sits next to. Mention one in a
  sentence if it matters; do not build a finding on it.
- Style this repository has not written down, and rewrites of code the diff
  only touches.

## Evidence, not inference

A finding cites the file and line it rests on. A claim about what code does
cites the code that does it, not a name that suggests it. If the evidence is
not in the diff, open the file: say what you read and what it showed, or do
not post the finding.

## After the first round

The blocking-only bar is about material this review has already seen. Material
a fix newly added is being reviewed for the first time, whatever round it
arrives in, so it gets a first-round review. What the bar rules out is
returning to material already reviewed with a fresh minor finding.
