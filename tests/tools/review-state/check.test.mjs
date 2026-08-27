import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { checkRound, renderCheck } from '../../../tools/review-state/check.mjs';

// The account the review runs as. Everything the agents post is authored by
// it, which is what tells an agent's comment from a passing stranger's.
const REVIEWER = 'john-t-white';
const HEAD_OID = 'abc1234def';
const EARLIER_OID = '0000111feed';
// A thread raised before this round, the round's own review, and a thread the
// round itself raised. A verdict is owed on the first and not on the third:
// no agent can render one on a finding it has just written.
const AT = '2026-08-26T12:00:00Z';
const ROUND_AT = '2026-08-26T13:00:00Z';
const LATER = '2026-08-26T14:00:00Z';

// The forms tools/review-post/ writes. A case that wants a compliant round
// asks for one of these rather than spelling the punctuation out again.
const roundBody = (agent, round, { blocking = 0, minor = 0, similar, definition } = {}) =>
  `**${agent}** — round ${round} · ${blocking} blocking, ${minor} minor` +
  ` · definition ${definition ?? '3f9a2c1b8e04 (main, branch)'}` +
  `${similar === undefined ? '' : ` (plus ${similar} similar: naming)`}. Looked at the diff.`;

const findingBody = (agent, severity = 'blocking') =>
  `**${agent}** — [${severity}] The check never runs.\n\nNothing catches it.\n\nRun it.`;

const verdictBody = (agent, verdict = 'RESOLVE') => `**${agent}** — ${verdict} — the fix holds.`;

const review = (body, { login = REVIEWER, at = ROUND_AT } = {}) => ({
  body,
  createdAt: at,
  author: { login },
});

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

// `line` is what a thread anchors to now and goes null once the thread is
// outdated; `subjectType` is what it was posted as and does not move. A case
// that wants an outdated thread passes `line: null` and leaves subjectType
// alone; one that wants a file-level finding passes `subjectType: 'FILE'`.
function thread({
  isResolved = false,
  path = 'tools/review-state/check.mjs',
  line = 10,
  originalLine = line,
  subjectType = 'LINE',
  comments,
}) {
  return {
    id: `PRRT_${(nextId += 1)}`,
    isResolved,
    path,
    line,
    originalLine,
    subjectType,
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
    const state = payload({
      reviews: [review(roundBody('review-code', 1), { login: 'passing-stranger' })],
    });
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

  test('is not a failure on a thread the round itself raised', () => {
    // The finding and its round record arrive together, and no agent renders
    // a verdict on a finding it has just written — verdicts are owed on the
    // re-review. Reported as owed, every first round would fail this check.
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [thread({ comments: [comment(findingBody('review-code'), { at: LATER })] })],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is a failure on a thread raised in an earlier round', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 }), { at: AT }),
        review(roundBody('review-code', 2), { at: LATER }),
      ],
      threads: [thread({ comments: [comment(findingBody('review-code'), { at: AT })] })],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 2 })), ['owes-verdict']);
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

  test('is a failure when the record names no definition, which only the command writes', () => {
    const state = payload({
      reviews: [review('**review-code** — round 1 · 0 blocking, 0 minor. Looked at the diff.')],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['hand-posted']);
  });

  test('passes a round whose definition matched neither copy, which is recorded, not refused', () => {
    const state = payload({
      reviews: [
        review(
          roundBody('review-code', 1, {
            definition: '9c14ab77e0d1 (matches neither main nor branch)',
          }),
        ),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('a round record numbering a different round is its own failure', () => {
    // The command wrote this body; what is wrong is the number it was given,
    // so saying it was not posted through the command would be untrue.
    const state = payload({ reviews: [review(roundBody('review-code', 4))] });
    const failures = checkRound(state, { 'review-code': 1 });
    assert.deepEqual(kinds(failures), ['wrong-round']);
    assert.match(failures[0].detail, /round 4/);
  });

  test('reads a round whose cap held back findings', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { minor: 3, similar: 2 }))] });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('reads a round whose held-back summary contains a paren', () => {
    // review-post takes `similar.about` as free prose, so a body the command
    // itself wrote must not read as one an agent composed.
    const body =
      '**review-code** — round 1 · 0 blocking, 3 minor · definition 3f9a2c1b8e04 (main, branch) ' +
      '(plus 2 similar: naming (mostly) and wording). Looked at the diff.';
    assert.deepEqual(checkRound(payload({ reviews: [review(body)] }), { 'review-code': 1 }), []);
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
    // The thread is anchored; what it lacks is the tag, and the two are
    // different failures.
    assert.deepEqual(kinds(failures), ['untagged']);
  });

  test('is a failure when a thread with no line is not marked file-level', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          line: null,
          subjectType: 'FILE',
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
      ],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 1 })), ['unanchored']);
  });

  test('is not a failure on a thread that has merely gone outdated', () => {
    // GitHub nulls `line` when a thread goes outdated, so a null line alone
    // says nothing about how the finding was posted. What it was anchored to
    // is `subjectType`, and a posted comment cannot be re-anchored — read as
    // unanchored, an outdated thread fails a round nobody can fix.
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { blocking: 1 }))],
      threads: [
        thread({
          line: null,
          originalLine: 42,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('is not a failure on a file-level finding that says so', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { minor: 1 }))],
      threads: [
        thread({
          line: null,
          subjectType: 'FILE',
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

  test('is a failure on two outdated threads that shared a line', () => {
    // The pair has to survive the threads going outdated: what they shared is
    // `originalLine`, which does not move.
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 })),
        review(roundBody('review-security', 1, { blocking: 1 })),
      ],
      threads: [
        thread({
          path: 'REVIEW.md',
          line: null,
          originalLine: 42,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
        thread({
          path: 'REVIEW.md',
          line: null,
          originalLine: 42,
          comments: [
            comment(findingBody('review-security')),
            comment(verdictBody('review-security')),
          ],
        }),
      ],
    });
    const failures = checkRound(state, { 'review-code': 1, 'review-security': 1 });
    assert.deepEqual(kinds(failures), ['unlinked-sibling']);
  });

  test('does not pair a live thread with an outdated one at the same number', () => {
    // `line` is where a thread sits now and `originalLine` where it was
    // raised. Comparing one against the other pairs two threads that were
    // never at the same place, on a coincidence of numbering.
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { blocking: 1 })),
        review(roundBody('review-security', 1, { blocking: 1 })),
      ],
      threads: [
        thread({
          path: 'REVIEW.md',
          line: null,
          originalLine: 42,
          comments: [comment(findingBody('review-security')), comment(verdictBody('review-security'))],
        }),
        thread({
          path: 'REVIEW.md',
          line: 42,
          originalLine: 7,
          comments: [comment(findingBody('review-code')), comment(verdictBody('review-code'))],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1, 'review-security': 1 }), []);
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

  test('is not a failure on two file-level threads in one file', () => {
    // A file-level finding has no line, and #32's criterion pairs threads
    // "sharing another's file and line". Two agents with unrelated things to
    // say about one file have nothing to link.
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1, { minor: 1 })),
        review(roundBody('review-security', 1, { minor: 1 })),
      ],
      threads: [
        thread({
          path: 'REVIEW.md',
          line: null,
          subjectType: 'FILE',
          comments: [
            comment(findingBody('review-code', 'minor · file-level'), { at: LATER }),
          ],
        }),
        thread({
          path: 'REVIEW.md',
          line: null,
          subjectType: 'FILE',
          comments: [
            comment(findingBody('review-security', 'minor · file-level'), { at: LATER }),
          ],
        }),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 1, 'review-security': 1 }), []);
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

describe('a minor finding raised after round one', () => {
  test('is a failure, whatever material it was raised on', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1)),
        review(roundBody('review-code', 2, { minor: 1 })),
      ],
    });
    const failures = checkRound(state, { 'review-code': 2 });
    assert.deepEqual(kinds(failures), ['minor-after-round-one']);
  });

  test('is reported once, not also as the cap it went over', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1)),
        review(roundBody('review-code', 2, { minor: 4 })),
      ],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 2 })), ['minor-after-round-one']);
  });

  test('is a failure when the cap merely held it back', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1)),
        review(roundBody('review-code', 2, { similar: 2 })),
      ],
    });
    assert.deepEqual(kinds(checkRound(state, { 'review-code': 2 })), ['minor-after-round-one']);
  });

  test('is not a failure in round one, which takes minor findings', () => {
    const state = payload({ reviews: [review(roundBody('review-code', 1, { minor: 3 }))] });
    assert.deepEqual(checkRound(state, { 'review-code': 1 }), []);
  });

  test('leaves a re-review raising only blocking findings alone', () => {
    const state = payload({
      reviews: [
        review(roundBody('review-code', 1)),
        review(roundBody('review-code', 2, { blocking: 2 })),
      ],
    });
    assert.deepEqual(checkRound(state, { 'review-code': 2 }), []);
  });
});

describe('a round that broke several rules', () => {
  test('reports every one of them', () => {
    const state = payload({
      reviews: [review(roundBody('review-code', 1, { minor: 5 }))],
      threads: [thread({ comments: [comment('**review-code** — the check never runs.')] })],
    });
    const failures = checkRound(state, { 'review-code': 1, 'review-test-plan': 1 });
    assert.deepEqual(kinds(failures).sort(), ['no-round', 'over-cap', 'owes-verdict', 'untagged']);
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
