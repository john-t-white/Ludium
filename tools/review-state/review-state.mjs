#!/usr/bin/env node
// Prints the review state of one pull request. See state.mjs for what is
// established and why it is established here rather than by an agent.
//
//   node tools/review-state/review-state.mjs [--pr <number>]
//
// Without --pr, the pull request for the current branch is used.

import { execFileSync } from 'node:child_process';

import { renderReport, reviewState } from './state.mjs';

const QUERY = `
query($owner:String!,$repo:String!,$pr:Int!){
  viewer{login}
  repository(owner:$owner,name:$repo){
    pullRequest(number:$pr){
      headRefOid
      reviews(first:100){nodes{author{login} submittedAt body}}
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

console.log(renderReport(reviewState(payload), pr));
