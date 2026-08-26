import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { checkRound, renderCheck } from '../../../tools/review-state/check.mjs';

// The account the review runs as. Everything the agents post is authored by
// it, which is what tells an agent's comment from a passing stranger's.
const REVIEWER = 'john-t-white';
const HEAD_OID = 'abc1234def';
const EARLIER_OID = '0000111feed';
const AT = '2026-08-26T12:00:00Z';
const LATER = '2026-08-26T13:00:00Z';

// The forms tools/review-post/ writes. A case that wants a compliant round
// asks for one of these rather than spelling the punctuation out again.
const roundBody = (agent, round, { blocking = 0, minor = 0, similar } = {}) =>
  `**${agent}** — round ${round} · ${blocking} blocking, ${minor} minor` +
  `${similar === undefined ? '' : ` (plus ${similar} similar: naming)`}. Looked at the diff.`;

const findingBody = (agent, severity = 'blocking') =>
  `**${agent}** — [${severity}] The check never runs.\n\nNothing catches it.\n\nRun it.`;

const verdictBody = (agent, verdict = 'RESOLVE') => `**${agent}** — ${verdict} — the fix holds.`;

const review = (body, login = REVIEWER) => ({ body, author: { login } });

let nextId = 1;

function comment(body, { at = AT, login = REVIEWER, oid = HEAD_OID } = {}) {
  return {
    databaseId: (nextId += 1) * 100,
    createdAt: at,
    body,
    author: { login },
    pullRequestReview: { commit: { oid } },
  };
}

function thread({ isResolved = false, path = 'tools/review-state/check.mjs', line = 10, comments }) {
  return {
    id: `PRRT_${(nextId += 1)}`,
    isResolved,
    path,
    line,
    comments: { nodes: comments },
  };
}

function payload({ reviews = [], threads = [], headRefOid = HEAD_OID } = {}) {
  return {
    data: {
      viewer: { login: REVIEWER },
      repository: {
        pullRequest: {
          headRefOid,
          reviews: { nodes: reviews },
          reviewThreads: { nodes: threads },
        },
      },
    },
  };
}

const kinds = (failures) => failures.map((failure) => failure.kind);

// One agent, dispatched to run round 1, that posted a clean round and owns
// one thread it has already answered. Every case below is this with one thing
// changed, so what a case is about is the line it changes.
function cleanRound() {
  const finding = comment(findingBody('review-code'));
  return {
    dispatched: { 'review-code': 1 },
    payload: payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [thread({ comments: [finding, comment(verdictBody('review-code'))] })],
    }),
  };
}

describe('a round that broke no rule', () => {
  test('passes', () => {
    const { payload: state, dispatched } = cleanRound();
    assert.deepEqual(checkRound(state, dispatched), []);
  });

  test('passes when the agent posted a round and opened no thread', () => {
    const state = payload({ reviews: [review(roundBody('review-test-plan', 1))] });
    assert.deepEqual(checkRound(state, { 'review-test-plan': 1 }), []);
  });

  test('says nothing about an agent that was not dispatched', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1))] });
    // review-security was left out of the round on purpose, so it owes nothing.
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });
});

describe('a dispatched agent that did not post', () => {
  test('is a failure when the round left no review behind', () => {
    // The failure #32 opens with: an agent returns findings to the session and
    // they exist nowhere but in that reply.
    const state = payload({ reviews: [review(roundBody('review-code', 1))] });
    const failures = checkRound(state, { 'review-code': 1, 'review-security': 1 });
    assert.deepEqual(kinds(failures), ['no-round']);
    assert.equal(failures[0].agent, 'review-security');
  });

  test('is a failure when the review carries no name prefix', () => {
    // An unprefixed review is one tools/review-state/ cannot count, so it is
    // not a round however much it reads like one.
    const state = payload({ reviews: [review('round 1 · 0 blocking, 0 minor. Looked.')] });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['no-round']);
  });

  test('is a failure when the review is somebody else writing the prefix', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1), 'passing-stranger')] });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['no-round']);
  });

  test('posting twice for one dispatch is its own failure', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1)), review(roundBody('review-code', 2))],
    });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['extra-round']);
    assert.match(failures[0].detail, /2 rounds/);
  });
});

describe('an owned thread left unverdicted', () => {
  test('is a failure when the agent never rendered one', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [thread({ comments: [comment(findingBody('review-code'))] })],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['owes-verdict']);
  });

  test('is a failure when the verdict answered an earlier commit', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          comments: [
            comment(findingBody('review-code'), { oid: EARLIER_OID }),
            comment(verdictBody('review-code'), { oid: EARLIER_OID }),
          ],
        }),
      ],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['owes-verdict']);
  });

  test('is not a failure on a thread its owner was not dispatched to answer', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1))],
      threads: [thread({ comments: [comment(findingBody('review-security'))] })],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is not a failure on a resolved thread', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1))],
      threads: [thread({ isResolved: true, comments: [comment(findingBody('review-code'))] })],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });
});

describe('a round not posted by tools/review-post/', () => {
  test('is a failure when the body is not the form the command writes', () => {
    // What every round before #33 looked like, and what a hand-built gh call
    // would look like again.
    const state = payload({ reviews: [review('**review-code** — round 1. Two findings.')] });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['hand-posted']);
    assert.equal(failures[0].agent, 'review-code');
  });

  test('is a failure when the body counts a round the agent was not dispatched to', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 4))] });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['hand-posted']);
    assert.match(failures[0].detail, /round 4/);
  });

  test('reads a round whose cap held back findings', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { minor: 3, similar: 2 }))] });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('checks only the round the agent was dispatched to run', () => {
    // An earlier round predating the command is history, not this round.
    const state = payload({
      reviews: [
        review('**review-code** — round 1. Two findings.'),
        review(roundBody('review-code', 2)),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 2 }), []);
  });
});

describe('an unanchored finding', () => {
  test('is a failure when the thread carries no severity tag', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          comments: [
            comment('**review-code** — the check never runs.'),
            comment(verdictBody('review-code')),
          ],
        }),
      ],
    });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['unanchored']);
  });

  test('is a failure when a thread with no line is not marked file-level', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          line: null,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
      ],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['unanchored']);
  });

  test('is not a failure on a file-level finding that says so', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { minor: 1 }))],
      threads: [
        thread({
          line: null,
          comments: [
            comment(findingBody('review-code', 'minor · file-level')),
            comment(verdictBody('review-code')),
          ],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is not a failure on a thread nobody claimed', () => {
    // A human's own comment on the diff is not a finding and has no form.
    const state = payload({
      reviews: [review(roundBody('review-code', 1))],
      threads: [thread({ comments: [comment('Why does this loop run twice?')] })],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });
});

describe('an unlinked sibling', () => {
  const sameSpot = { path: 'REVIEW.md', line: 42 };

  test('is a failure when two agents raise one line without linking', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 })),
        review(roundBody('review-security', 1, { blocking: 1 })),
      ],
      threads: [
        thread({
          ...sameSpot,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
        thread({
          ...sameSpot,
          comments: [
            comment(findingBody('review-security')),
            comment(verdictBody('review-security')),
          ],
        }),
      ],
    });
    const failures = checkRound(state, { 'review-code': 1, 'review-security': 1 });
    assert.deepEqual(kinds(failures), ['unlinked-sibling']);
    assert.match(failures[0].detail, /REVIEW\.md:42/);
  });

  test('is not a failure when the second thread links the first', () => {
    const first = comment(findingBody('review-code'));
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 })),
        review(roundBody('review-security', 1, { blocking: 1 })),
      ],
      threads: [
        thread({ ...sameSpot, comments: [first, comment(verdictBody('review-code'))] }),
        thread({
          ...sameSpot,
          comments: [
            comment(
              `${findingBody('review-security')}\n\nSame problem as ` +
                `https://github.com/o/r/pull/34#discussion_r${first.databaseId}`,
            ),
            comment(verdictBody('review-security')),
          ],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1, 'review-security': 1 }), []);
  });

  test('is not a failure when one agent owns both threads', () => {
    // One agent raising two findings on one line is two findings, not a pair
    // of angles on one problem, and there is nothing to link.
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 2 }))],
      threads: [
        thread({
          ...sameSpot,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
        thread({
          ...sameSpot,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is not a failure when the other thread is resolved', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          ...sameSpot,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
        thread({
          ...sameSpot,
          isResolved: true,
          comments: [comment(findingBody('review-security'))],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is not a failure on two threads in the same file at different lines', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 })),
        review(roundBody('review-security', 1, { blocking: 1 })),
      ],
      threads: [
        thread({
          path: 'REVIEW.md',
          line: 42,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
        thread({
          path: 'REVIEW.md',
          line: 43,
          comments: [
            comment(findingBody('review-security')),
            comment(verdictBody('review-security')),
          ],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1, 'review-security': 1 }), []);
  });
});

describe('a round over the minor-findings cap', () => {
  test('is a failure at four minor findings', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { minor: 4 }))] });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['over-cap']);
    assert.match(failures[0].detail, /4/);
  });

  test('is not a failure at three, however many were held back', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { minor: 3, similar: 9 }))],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('does not cap blocking findings', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { blocking: 7 }))] });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });
});

describe('a round that broke several rules', () => {
  test('reports every one of them', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { minor: 5 }))],
      threads: [thread({ comments: [comment('**review-code** — the check never runs.')] })],
    });
    const failures = checkRound(state, { 'review-code': 1, 'review-test-plan': 1 });
    assert.deepEqual(kinds(failures).sort(), ['no-round', 'over-cap', 'owes-verdict', 'unanchored']);
  });
});

describe('renderCheck', () => {
  test('names the agent and what it broke, one line at a time', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { minor: 4 }))] });
    const report = renderCheck(checkRound(state, { 'review-code': 1, 'review-security': 1 }));
    assert.match(report, /review-security/);
    assert.match(report, /review-code/);
    assert.match(report, /4 minor/);
  });

  test('says so plainly when nothing failed', () => {
    const { payload: state, dispatched } = cleanRound();
    assert.match(renderCheck(checkRound(state, dispatched)), /passed/i);
  });
});
