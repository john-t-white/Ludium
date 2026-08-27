#!/usr/bin/env node
// Posts one review round to a pull request. See payload.mjs for what is
// applied to a round on the way out and why it is applied here.
//
//   node tools/review-post/review-post.mjs round --pr <n> --agent <name> --round <r> <<'JSON'
//
// The round comes in on stdin as JSON, from a quoted heredoc — finding bodies
// are multi-line and quote material containing apostrophes, which no shell
// argument survives, and the agents have no tool that writes a file.
// Run with --help for the fields, or --dry-run to print the calls unsent.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { identify } from './definition.mjs';
import { AGENTS, SEVERITIES, plan } from './payload.mjs';
import { post } from './post.mjs';

const USAGE = `Post one review round.

  node tools/review-post/review-post.mjs round --pr <n> --agent <name> --round <r> <<'JSON'

  --pr <n>       pull request number
  --agent <a>    ${AGENTS.join(' | ')}
  --round <r>    the round you were dispatched to run, from the state report
  --dry-run      print the calls instead of making them

The round is one JSON object on stdin, ended by a line reading JSON. Every
field below that is not marked optional is required, and the command refuses a
round that omits one:

  {
    "summary":  "what this round looked at and concluded — posted as the round
                 record, which is what proves the round reached the pull request",
    "definition": "your own instruction text, quoted from what you were given.
                 Quote what you are running on: do not read your definition file
                 off disk, which is the branch's copy whichever one you loaded.
                 The command fingerprints it and records which checked-in copy
                 it matches, so nobody has to take your word for it. Anything
                 your harness wrapped around it is ignored; escaping is not, so
                 a backslash lost to JSON reads as a definition nobody has",
    "similar":  {"count": 3, "about": "one line"},        // optional, round 1
                                                          // only: minor findings
                                                          // the cap held back
    "findings": [
      {
        "path":      "path/in/the/diff",
        "line":      42,                  // omit only with "fileLevel": true
        "fileLevel": true,                // optional: a finding with no line to
                                          // anchor to, e.g. about the PR description
        "severity":  "${SEVERITIES.join('" | "')}",   // only "blocking" after round 1
        "wrong":     "what is wrong",
        "causes":    "what it causes, with an example where one clarifies it",
        "recommend": "what to do about it",
        "sibling":   3843575153           // optional: comment id of the thread
                                          // another agent already opened on this problem
      }
    ],
    "replies":  [{"comment": 123456, "body": "follow-up on a thread you own"}],
    "verdicts": [{"thread": "PRRT_…", "comment": 123456,
                  "verdict": "RESOLVE" | "DON'T RESOLVE", "because": "one line"}]
  }

The command adds your name prefix and the severity tag, renders the sibling
link, records which copy of your definition you ran, and resolves a thread you
RESOLVE. From round two it takes only blocking findings, on every material the
round sees — a minor one, posted or held back, is a round it refuses. Ids are
checked for shape, not just presence. Findings post as one review, so a line
outside the diff rejects the round: fix the anchor and run it again.`;

const argv = process.argv.slice(2);

function flag(name) {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
}

if (argv.includes('--help') || argv.length === 0) {
  console.log(USAGE);
  process.exit(0);
}
if (argv[0] !== 'round') {
  console.error(`Unknown command "${argv[0]}". Run with --help.`);
  process.exit(2);
}

const gh = (...args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

const pr = Number(flag('pr'));
if (!Number.isInteger(pr)) {
  console.error('--pr <number> is required.');
  process.exit(2);
}

const round = {
  ...JSON.parse(readFileSync(0, 'utf8')),
  agent: flag('agent'),
  round: Number(flag('round')),
};

if (typeof round.definition !== 'string' || round.definition.trim() === '') {
  console.error('definition is required: quote your own instruction text. Run with --help.');
  process.exit(2);
}

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * The checked-in copies of one agent's definition: `main`'s and the branch's.
 *
 * The working tree is not among them: naming it `worktree` reads as a copy
 * somebody could go and look at, and it is not one. An uncommitted edit then
 * records as `matches neither main nor branch`, which is what it is — unless
 * the edit only wrapped the file, adding text above or below it and changing
 * no word of it. definition.mjs matches by containment and cannot tell that
 * from the harness's own wrapping, so it reads as the copy it extends. That is
 * the cost of matching an honest quote at all, and it is the direction that
 * fails safe: before it, every honest quote read as `matches neither` and the
 * alarm meant nothing.
 *
 * A copy that cannot be read is left out rather than reported as empty: a new
 * agent file has no copy on `main`, and a round is still worth posting.
 */
function definitionCopies(agent) {
  const path = `.claude/agents/${agent}.md`;
  const read = (name, ref) => {
    try {
      return { name, text: git('show', `${ref}:${path}`) };
    } catch {
      return undefined;
    }
  };
  return [read('main', 'main'), read('branch', 'HEAD')].filter((copy) => copy !== undefined);
}

const { owner, name } = JSON.parse(gh('repo', 'view', '--json', 'owner,name'));
const { headRefOid } = JSON.parse(gh('pr', 'view', String(pr), '--json', 'headRefOid'));

let steps;
try {
  steps = plan(round, {
    owner: owner.login,
    repo: name,
    pr,
    headOid: headRefOid,
    definition: identify(round.definition, definitionCopies(round.agent)),
  });
} catch (error) {
  console.error(`Round rejected: ${error.message}`);
  process.exit(2);
}

const RESOLVE = `mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}`;

const dryRun = argv.includes('--dry-run');

if (dryRun) {
  for (const step of steps) {
    console.log(`would post — ${step.label}`);
    console.log(JSON.stringify(step.body ?? { threadId: step.threadId }, null, 2));
  }
  process.exit(0);
}

// gh reads a -F value beginning with @ from a local file; -f never does, and
// GraphQL takes the thread id as the string it is.
const execute = (step) =>
  step.kind === 'resolve'
    ? execFileSync('gh', ['api', 'graphql', '-f', `query=${RESOLVE}`, '-f', `id=${step.threadId}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : execFileSync('gh', ['api', step.endpoint, '--input', '-'], {
        input: JSON.stringify(step.body),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

const result = post(steps, (step) => {
  try {
    return execute(step);
  } catch (error) {
    throw new Error(error.stderr ?? error.message);
  }
});

for (const label of result.posted) console.log(`posted — ${label}`);
for (const { label, error } of result.failed) {
  console.error(`FAILED — ${label}\n${error.message}`);
}
for (const label of result.skipped) {
  console.error(`SKIPPED — ${label}: the verdict it depends on did not post`);
}

if (result.failed.length > 0) {
  // Which of the two this is decides what to do next, so it is said plainly:
  // running the whole round again after the review posted would post a second
  // review, and the state tool would read that as a second round.
  console.error(
    result.reviewPosted
      ? `\nThe round is on the pull request; ${result.failed.length} call(s) after it failed.\n` +
          'Run those again on their own — posting the whole round again posts a second review.'
      : '\nThe review was rejected, so this round is not on the pull request at all.\n' +
          'Fix what it reports and run the round again.',
  );
  process.exit(1);
}
