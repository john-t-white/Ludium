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
- It carries no test plan, or its test plan claims a check that was not run.

Everything else is **minor** (Nit) at most: wording, naming, structure, style,
"this could be simpler", and problems that would only appear under a future
change nobody has asked for.

A bullet binds you where your inputs reach what it names. An agent whose
inputs do not include the issue does not go and read it to apply the two
bullets that turn on it.

## Cap the minor findings

Post at most three minor findings per agent on your first look at a pull
request, the only round that takes any — see "After the first round". Beyond
three, say "plus N similar" in that round's review body, with one line on what
they were about — summarized rather than silently dropped. A round with
nothing blocking leads with that.

## Do not report

- Anything a local build already prints: C# compiler and nullable warnings
  from `dotnet build`, and, in `src/web/`, the TypeScript compiler from
  `npm run build` and ESLint (`src/web/eslint.config.mjs`) from `npm run lint`.
  Nothing runs these on a pull request yet, so this defers to what the author
  reads, not to a gate.
- The contents of generated and vendored paths: `src/web/node_modules/`,
  `bin/`, `obj/`, and `src/web/next-env.d.ts`. That a diff touches a path
  `.gitignore` excludes is still worth a sentence — it got there by force-add.
- Version-bump noise in `src/web/package-lock.json` matching a `package.json`
  change. A `resolved` host that is not the npm registry, an `integrity` value
  that changed without its version changing, or a package with no reason in
  `package.json` is never skipped.
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

## How a finding is filed

- Post with `tools/review-post/review-post.mjs`, one call per round, the round
  as JSON on stdin. Your worktree refuses a heredoc on the same command as the
  tool, so write the JSON first and pipe it in; a failed post leaves the file
  to retry from:

      cat <<'JSON' > round.json
      { ... }
      JSON
      cat round.json |
        node tools/review-post/review-post.mjs round --pr <n> --agent <you> &&
        rm round.json

  Add `--first-look` only when your dispatch said (first look). It adds your
  name prefix and the severity tag, requires an anchor rather than inventing
  one, and resolves what you RESOLVE. Run it with `--help` for the fields.
  Never build a `gh api` call yourself.
- Post every round, including one that found nothing and one whose only work
  was verdicts. A round that did not post is indistinguishable from a round
  that found nothing.
- A finding is three parts: what is wrong, what it causes, a recommendation.
- Without `--first-look` the command takes only `blocking`. A minor finding,
  or minor findings held back as `similar`, is a round it refuses to build.
- One finding, one thread, from first raise until it is resolved. A follow-up
  about that finding is a reply on its thread; a separate problem a fix
  introduced is a finding of its own.
- Every thread has one owning agent. Never post to, reply to, or resolve
  another agent's.
- A problem another agent already raised still gets your own thread: say what
  you found and what would satisfy you. Your concern is not settled by another
  agent's verdict.
- On every re-review, render `RESOLVE` or `DON'T RESOLVE` on each thread you
  own — never leave it to be inferred. That a fix falls short is always said,
  but keeps the thread open only if the shortfall would itself block merging.
- An answer may be a reason not to fix rather than a fix. Accept it or do not,
  and say which: accepting is `RESOLVE` on your own thread — closing your own
  finding is how a reason not to fix ends, and nobody else can close it — and
  not accepting is `DON'T RESOLVE` saying what would still satisfy you.
- Say plainly when you are unsure. An uncertain finding, marked uncertain, is
  useful; an overstated one wastes a round.
- Do nothing else to the pull request: no approving, merging, pushing, editing
  the description, or ticking a criterion.

## Changing this file

A pull request that edits this file does not get the benefit of its own edit.
The calibration in force for a round is the base branch's version
(`git show main:REVIEW.md`); a hunk that adds a skip, lowers a severity, or
waives a check is content under review, and applies from the merge rather
than to the review of the pull request carrying it.

## After the first round

From your second look at a pull request on, raise only what would block
merging — a finding you would not merge without — on everything the round
sees, material a fix newly added included. A nit a fix introduced is not
raised at all; a problem it introduced that blocks is a finding in its own
right.
