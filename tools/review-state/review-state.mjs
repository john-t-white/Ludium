#!/usr/bin/env node
// Prints the review state of one pull request, or checks a completed round
// against it. See state.mjs for what is established and why it is established
// here rather than by an agent, and check.mjs for what a round has to obey.
//
//   node tools/review-state/review-state.mjs [--pr <number>]
//   node tools/review-state/review-state.mjs check --pr <n> --dispatched <spec>
//
// Without --pr, the pull request for the current branch is used. The check
// exits 1 on a round that broke a rule and 0 on one that did not, so a round
// that went wrong stops the review rather than being read past.
//
// <spec> is the agents the round actually ran and the round each was
// dispatched to run: review-code=2,review-security=2. An agent left out of
// the round on purpose is left out of the spec.

import { execFileSync } from 'node:child_process';

import { checkRound, renderCheck } from './check.mjs';
import { AGENTS, renderReport, reviewState } from './state.mjs';

const QUERY = `
query($owner:String!,$repo:String!,$pr:Int!){
  viewer{login}
  repository(owner:$owner,name:$repo){
    pullRequest(number:$pr){
      headRefOid
      reviews(first:100){nodes{author{login} body}}
      reviewThreads(first:100){nodes{
        id isResolved path line
        comments(first:50){nodes{databaseId createdAt body author{login} pullRequestReview{commit{oid}}}}
      }}
    }
  }
}`;

const gh = (...args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

function prNumber() {
  const flag = process.argv.indexOf('--pr');
  if (flag !== -1) return Number(process.argv[flag + 1]);
  return JSON.parse(gh('pr', 'view', '--json', 'number')).number;
}

/** The --dispatched spec as {agent: round}, or an exit explaining why not. */
function dispatched() {
  const flag = process.argv.indexOf('--dispatched');
  const spec = flag === -1 ? undefined : process.argv[flag + 1];
  if (spec === undefined) {
    console.error(`check needs --dispatched <agent>=<round>[,...] — ${AGENTS.join(', ')}`);
    process.exit(2);
  }
  const entries = spec.split(',').map((pair) => {
    const [agent, round] = pair.split('=');
    if (!AGENTS.includes(agent) || !/^[1-9][0-9]*$/.test(round ?? '')) {
      console.error(`"${pair}" is not <agent>=<round>. Agents: ${AGENTS.join(', ')}`);
      process.exit(2);
    }
    return [agent, Number(round)];
  });
  return Object.fromEntries(entries);
}

// Read before anything is fetched, so a mistyped spec costs no API calls.
const checking = process.argv[2] === 'check';
const agents = checking ? dispatched() : null;

const { owner, name } = JSON.parse(gh('repo', 'view', '--json', 'owner,name'));
const pr = prNumber();
const payload = JSON.parse(
  gh(
    'api',
    'graphql',
    '-f',
    `query=${QUERY}`,
    '-F',
    `owner=${owner.login}`,
    '-F',
    `repo=${name}`,
    '-F',
    `pr=${pr}`,
  ),
);

if (!checking) {
  console.log(renderReport(reviewState(payload), pr));
  process.exit(0);
}

const failures = checkRound(payload, agents);
console.log(renderCheck(failures));
if (failures.length > 0) process.exit(1);
