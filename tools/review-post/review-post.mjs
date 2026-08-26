#!/usr/bin/env node
// Posts one review round to a pull request. See payload.mjs for what is
// applied to a round on the way out and why it is applied here.
//
//   node tools/review-post/review-post.mjs round --pr <n> --agent <name> --round <r> < round.json
//
// The round comes in on stdin as JSON — finding bodies are multi-line and
// quote material that contains apostrophes, which no shell argument survives.
// Run with --help for the fields, or --dry-run to print the calls unsent.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { AGENTS, SEVERITIES, plan } from './payload.mjs';

const USAGE = `Post one review round.

  node tools/review-post/review-post.mjs round --pr <n> --agent <name> --round <r> < round.json

  --pr <n>       pull request number
  --agent <a>    ${AGENTS.join(' | ')}
  --round <r>    the round you were dispatched to run, from the state report
  --dry-run      print the calls instead of making them

The round is one JSON object on stdin. Every field below that is not marked
optional is required, and the command refuses a round that omits one:

  {
    "summary":  "what this round looked at and concluded — posted as the round
                 record, which is what proves the round reached the pull request",
    "similar":  {"count": 3, "about": "one line"},        // optional: minor
                                                          // findings the cap held back
    "findings": [
      {
        "path":      "path/in/the/diff",
        "line":      42,                  // omit only with "fileLevel": true
        "fileLevel": true,                // optional: a finding with no line to
                                          // anchor to, e.g. about the PR description
        "severity":  "${SEVERITIES.join('" | "')}",
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

The command adds your name prefix, the severity tag, and the sibling link, and
resolves a thread you RESOLVE. Findings post as one review, so a line outside
the diff rejects the round: fix the anchor and run it again.`;

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

const { owner, name } = JSON.parse(gh('repo', 'view', '--json', 'owner,name'));
const { headRefOid } = JSON.parse(gh('pr', 'view', String(pr), '--json', 'headRefOid'));

let steps;
try {
  steps = plan(round, { owner: owner.login, repo: name, pr, headOid: headRefOid });
} catch (error) {
  console.error(`Round rejected: ${error.message}`);
  process.exit(2);
}

const RESOLVE = `mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}`;

const dryRun = argv.includes('--dry-run');
let failed = 0;

for (const step of steps) {
  if (dryRun) {
    console.log(`would post — ${step.label}`);
    console.log(JSON.stringify(step.body ?? { threadId: step.threadId }, null, 2));
    continue;
  }
  try {
    if (step.kind === 'resolve') {
      execFileSync('gh', ['api', 'graphql', '-f', `query=${RESOLVE}`, '-F', `id=${step.threadId}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } else {
      execFileSync('gh', ['api', step.endpoint, '--input', '-'], {
        input: JSON.stringify(step.body),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
    console.log(`posted — ${step.label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAILED — ${step.label}\n${error.stderr ?? error.message}`);
    // A rejected review posts nothing at all, and everything after it answers
    // threads that round was supposed to open. Stop rather than leave a round
    // half on the pull request.
    if (step.kind === 'review') break;
  }
}

if (failed > 0) {
  console.error(`\n${failed} call(s) failed. The round is not on the pull request.`);
  process.exit(1);
}
