// Asserts that a completed round obeyed the rules, where state.mjs only
// reports what happened. Every rule below was prose in the four agent files
// first, and every one of them was broken at least once while it was: an
// agent that returned findings and never posted them, a thread its owner
// never rendered a verdict on, a sibling named as text rather than linked.
// A rule the tooling can observe is a rule that holds, so these exit non-zero
// rather than printing something a reader has to notice.
//
// Pure: everything below reads the GraphQL payload it is handed and the
// dispatch it was told about, and nothing else.

import { anchor, linkedGroups, postedBy, reviewState } from './state.mjs';

// REVIEW.md's cap. Beyond this an agent summarizes the rest as "plus N
// similar" in the round body, which is why a held-back count is not a breach.
const MINOR_CAP = 3;

// The round record tools/review-post/ writes. Matching it is what says the
// round went out through the command: a body in any other form is one an
// agent composed itself, and nothing then guarantees its findings were
// anchored, prefixed, or tagged.
const ROUND =
  /^\s*\*\*review-[a-z-]+\*\*\s*[—-]\s*round (\d+) · \d+ blocking, (\d+) minor(?: \(plus \d+ similar:[^)]*\))?\./;

// The severity tag the command writes on a finding's first line, and the
// marker that distinguishes a finding with no line to anchor to from one
// whose anchor went missing.
const SEVERITY = /^\s*\*\*review-[a-z-]+\*\*\s*[—-]\s*\[(?:blocking|minor)( · file-level)?\]/;

/**
 * What went wrong with one round, or an empty list.
 *
 * `dispatched` maps each agent the round actually ran to the round number it
 * was told to run. An agent left out on purpose is absent from it, so a round
 * nobody ran stops looking like a round that found nothing — which is the
 * distinction the skill could previously only make in prose.
 */
export function checkRound(payload, dispatched) {
  const state = reviewState(payload);
  const reviews = payload.data.repository.pullRequest.reviews.nodes;
  const bodyOf = firstComments(payload, state.reviewAccount);
  const failures = [];

  for (const [agent, round] of Object.entries(dispatched)) {
    checkRoundRecord(agent, round, reviews, state.reviewAccount, failures);
  }

  for (const thread of state.threads) {
    if (thread.owesVerdict && dispatched[thread.owner] !== undefined) {
      failures.push({
        kind: 'owes-verdict',
        agent: thread.owner,
        detail: `${anchor(thread)} — thread ${thread.id} has no verdict for this state`,
      });
    }
  }

  failures.push(...unanchored(state, bodyOf));
  failures.push(...unlinkedSiblings(state));
  return failures;
}

/** The first comment's body per thread id, for the threads an agent owns. */
function firstComments(payload, reviewAccount) {
  const bodies = new Map();
  for (const node of payload.data.repository.pullRequest.reviewThreads.nodes) {
    const first = node.comments.nodes[0];
    if (first !== undefined && postedBy(first, reviewAccount) !== null) {
      bodies.set(node.id, first.body);
    }
  }
  return bodies;
}

function checkRoundRecord(agent, round, reviews, reviewAccount, failures) {
  const posted = reviews.filter((review) => postedBy(review, reviewAccount) === agent);

  // A review the state tool cannot count is not a round, however much it
  // reads like one: no name prefix, or somebody other than the review account
  // writing the prefix.
  if (posted.length < round) {
    failures.push({
      kind: 'no-round',
      agent,
      detail: `dispatched to run round ${round} and has posted ${posted.length}`,
    });
    return;
  }
  if (posted.length > round) {
    failures.push({
      kind: 'extra-round',
      agent,
      detail: `dispatched to run round ${round} and has posted ${posted.length} rounds`,
    });
    return;
  }

  const match = ROUND.exec(posted[round - 1].body);
  if (match === null) {
    failures.push({
      kind: 'hand-posted',
      agent,
      detail: 'the round record is not the form tools/review-post/ writes',
    });
    return;
  }
  if (Number(match[1]) !== round) {
    failures.push({
      kind: 'hand-posted',
      agent,
      detail: `the round record says round ${match[1]}, dispatched to run round ${round}`,
    });
    return;
  }

  // The count is the command's own, written from the findings it posted, and
  // the check above is what says the command wrote it.
  const minor = Number(match[2]);
  if (minor > MINOR_CAP) {
    failures.push({
      kind: 'over-cap',
      agent,
      detail: `${minor} minor findings in one round, cap is ${MINOR_CAP}`,
    });
  }
}

function unanchored(state, bodyOf) {
  const failures = [];
  for (const thread of state.threads) {
    if (thread.isResolved || thread.owner === null) continue;
    const match = SEVERITY.exec(bodyOf.get(thread.id) ?? '');
    if (match === null) {
      failures.push({
        kind: 'unanchored',
        agent: thread.owner,
        detail: `${anchor(thread)} — thread ${thread.id} carries no severity tag`,
      });
    } else if (thread.line === null && match[1] === undefined) {
      failures.push({
        kind: 'unanchored',
        agent: thread.owner,
        detail: `${anchor(thread)} — thread ${thread.id} has no line and is not file-level`,
      });
    }
  }
  return failures;
}

/**
 * Two agents on one problem file two threads by design, and the second names
 * the first by linking its comment. Written as bare text the link does not
 * join them, and the two get reported apart — which is what happened on #30.
 * Two open threads at one spot, owned by different agents and in different
 * groups, is that failure.
 */
function unlinkedSiblings(state) {
  const group = new Map();
  linkedGroups(state.threads).forEach((threads, index) => {
    for (const thread of threads) group.set(thread.id, index);
  });

  const open = state.threads.filter((thread) => !thread.isResolved && thread.owner !== null);
  const failures = [];
  for (let i = 0; i < open.length; i += 1) {
    for (let j = i + 1; j < open.length; j += 1) {
      const [one, other] = [open[i], open[j]];
      if (one.path !== other.path || one.line !== other.line) continue;
      if (one.owner === other.owner) continue;
      if (group.get(one.id) === group.get(other.id)) continue;
      failures.push({
        kind: 'unlinked-sibling',
        agent: other.owner,
        detail:
          `${anchor(one)} — ${one.owner} and ${other.owner} raised it on separate ` +
          'threads with no link between them',
      });
    }
  }
  return failures;
}

const LABEL = {
  'no-round': 'did not post its round',
  'extra-round': 'posted more rounds than it was dispatched to run',
  'hand-posted': 'did not post through tools/review-post/',
  'owes-verdict': 'left a thread it owns unverdicted',
  unanchored: 'posted a finding that is not anchored',
  'unlinked-sibling': 'left a sibling thread unlinked',
  'over-cap': 'went over the minor-findings cap',
};

/** The result as one report. The caller decides the exit code. */
export function renderCheck(failures) {
  if (failures.length === 0) {
    return 'Round check passed: every dispatched agent posted, and what the round left is well formed.';
  }
  return [
    `Round check failed (${failures.length}):`,
    '',
    ...failures.map((failure) => `  ${failure.agent} ${LABEL[failure.kind]} — ${failure.detail}`),
  ].join('\n');
}
