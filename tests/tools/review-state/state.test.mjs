import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ownerOf,
  postedBy,
  roundFor,
  verdictIn,
  owesVerdict,
  linkedGroups,
  reviewState,
  renderReport,
} from '../../../tools/review-state/state.mjs';

// A real recording of the GraphQL response for merged PR #29, with every
// comment body cut to its first line so the fixture stays readable. Nothing
// this module reads was removed: the agent prefix, the verdict, and any
// cross-reference all live at the front of a body.
const pr29 = JSON.parse(
  readFileSync(new URL('./fixtures/pr-29.json', import.meta.url), 'utf8'),
);

const HEAD_AT = '2026-08-21T20:00:00Z';
// The account the review runs as. Everything the agents post is authored by
// it; anyone else on a public repository can write the same text.
const REVIEWER = 'john-t-white';
// The commit a payload's pull request is currently on, and the one a comment
// is recorded against unless a case says otherwise.
const HEAD_OID = 'abc1234def';
const EARLIER_OID = '0000111feed';
const OUTSIDER = 'passing-stranger';

// Builds the shape reviewState reads, so a test states only what it is about.
function payload({ reviews = [], threads = [], headAt = HEAD_AT } = {}) {
  return {
    data: {
      viewer: { login: REVIEWER },
      repository: {
        pullRequest: {
          headRefOid: HEAD_OID,
          reviews: {
            nodes: reviews.map((review) =>
              typeof review === 'string'
                ? { body: review, submittedAt: headAt, author: { login: REVIEWER } }
                : { submittedAt: HEAD_AT, ...review },
            ),
          },
          reviewThreads: { nodes: threads },
        },
      },
    },
  };
}

let nextId = 1;
function thread({ isResolved = false, path = 'REVIEW.md', line = 10, comments }) {
  const id = `PRRT_${nextId++}`;
  return {
    id,
    isResolved,
    path,
    line,
    comments: {
      nodes: comments.map(([body, createdAt = HEAD_AT, login = REVIEWER, oid = HEAD_OID], i) => {
        const databaseId = nextId * 1000 + i;
        return {
          databaseId,
          createdAt,
          body,
          author: { login },
          pullRequestReview: { commit: { oid } },
        };
      }),
    },
  };
}

describe('ownerOf', () => {
  test('reads the agent name from the bold prefix', () => {
    assert.equal(ownerOf('**review-code** — this is wrong'), 'review-code');
    assert.equal(ownerOf('**review-test-plan** — round 2. No findings.'), 'review-test-plan');
  });

  test('a thread nobody prefixed has no owner', () => {
    assert.equal(ownerOf('Looks fine to me'), null);
    assert.equal(ownerOf(''), null);
  });

  test('a name that is not one of the four agents is not an owner', () => {
    assert.equal(ownerOf('**review-everything** — a finding'), null);
  });

  test('a name mentioned mid-body does not claim ownership', () => {
    assert.equal(ownerOf('I agree with **review-code** here'), null);
  });
});

describe('postedBy', () => {
  test('the prefix counts only on a comment the review account wrote', () => {
    const body = '**review-code** — a finding';
    assert.equal(postedBy({ body, author: { login: REVIEWER } }, REVIEWER), 'review-code');
    assert.equal(postedBy({ body, author: { login: OUTSIDER } }, REVIEWER), null);
  });

  test('a comment with no author at all claims nothing', () => {
    assert.equal(postedBy({ body: '**review-code** — a finding', author: null }, REVIEWER), null);
  });
});

describe('roundFor', () => {
  const review = (body, login = REVIEWER) => ({ body, author: { login } });

  test('the next round is one past the rounds an agent has posted', () => {
    const reviews = [
      review('**review-code** — round 1. Two findings.'),
      review('**review-security** — round 1. No findings.'),
      review('**review-code** — round 2. One finding.'),
    ];
    assert.equal(roundFor('review-code', reviews, REVIEWER), 3);
    assert.equal(roundFor('review-security', reviews, REVIEWER), 2);
    assert.equal(roundFor('review-test-plan', reviews, REVIEWER), 1);
  });

  test('the empty-bodied reviews GitHub records for replies are not rounds', () => {
    const reviews = [review(''), review('**review-code** — round 1.'), review('')];
    assert.equal(roundFor('review-code', reviews, REVIEWER), 2);
  });

  test('a review by anyone else cannot advance an agent past round 1', () => {
    const reviews = [
      review('**review-code** — round 1.', OUTSIDER),
      review('**review-code** — round 2.', OUTSIDER),
    ];
    assert.equal(roundFor('review-code', reviews, REVIEWER), 1);
  });

  test('agents count their own rounds independently on the real PR #29', () => {
    const reviews = pr29.data.repository.pullRequest.reviews.nodes;
    assert.equal(roundFor('review-code', reviews, REVIEWER), 4);
    assert.equal(roundFor('review-security', reviews, REVIEWER), 3);
    assert.equal(roundFor('review-acceptance-criteria', reviews, REVIEWER), 3);
    assert.equal(roundFor('review-test-plan', reviews, REVIEWER), 3);
  });
});

describe('verdictIn', () => {
  test('reads both verdicts in the form an agent posts them', () => {
    assert.equal(verdictIn('**review-code** — RESOLVE — the fix covers it'), 'RESOLVE');
    assert.equal(verdictIn("**review-code** — DON'T RESOLVE — still missing"), "DON'T RESOLVE");
  });

  test("DON'T RESOLVE is not read as RESOLVE, whichever apostrophe was typed", () => {
    assert.equal(verdictIn("**review-code** — DON'T RESOLVE — still missing"), "DON'T RESOLVE");
    assert.equal(verdictIn('**review-code** — DON’T RESOLVE — still missing'), "DON'T RESOLVE");
  });

  test('a finding that merely says the word renders no verdict', () => {
    assert.equal(
      verdictIn('**review-code** — verdictIn matches the bare substring RESOLVE anywhere'),
      null,
    );
    assert.equal(
      verdictIn("**review-security** — a stale DON'T RESOLVE would retire the thread"),
      null,
    );
  });

  test('a finding that carries no verdict is not one', () => {
    assert.equal(verdictIn('**review-code** — the blocking list has no bullet'), null);
  });

  test('every verdict really posted on PR #29 is still read as one', () => {
    const bodies = pr29.data.repository.pullRequest.reviewThreads.nodes
      .flatMap((node) => node.comments.nodes)
      .map((comment) => comment.body);
    assert.equal(bodies.filter((body) => verdictIn(body) !== null).length, 9);
  });
});

describe('owesVerdict', () => {
  const owner = 'review-code';
  const open = (verdict, latestOtherCommentAt = null) => ({
    isResolved: false,
    owner,
    verdict,
    latestOtherCommentAt,
  });

  test('an unresolved thread with no verdict on it owes one', () => {
    assert.equal(owesVerdict(open(null), HEAD_OID), true);
  });

  test('a verdict written against an earlier commit does not answer for the fix', () => {
    const verdict = { kind: "DON'T RESOLVE", at: HEAD_AT, answeredFor: EARLIER_OID };
    assert.equal(owesVerdict(open(verdict), HEAD_OID), true);
  });

  test('a verdict written against the current head settles the round', () => {
    const verdict = { kind: "DON'T RESOLVE", at: HEAD_AT, answeredFor: HEAD_OID };
    assert.equal(owesVerdict(open(verdict), HEAD_OID), false);
  });

  test('a reply after the verdict reopens the question even on the same commit', () => {
    const verdict = { kind: 'RESOLVE', at: '2026-08-21T20:30:00Z', answeredFor: HEAD_OID };
    assert.equal(owesVerdict(open(verdict, '2026-08-21T21:00:00Z'), HEAD_OID), true);
  });

  test('a verdict answering the last reply on the thread settles it', () => {
    const verdict = { kind: 'RESOLVE', at: '2026-08-21T21:30:00Z', answeredFor: HEAD_OID };
    assert.equal(owesVerdict(open(verdict, '2026-08-21T21:00:00Z'), HEAD_OID), false);
  });

  test('a resolved thread owes nothing', () => {
    assert.equal(owesVerdict({ ...open(null), isResolved: true }, HEAD_OID), false);
  });

  test('a thread no agent owns is never asked for a verdict', () => {
    assert.equal(owesVerdict({ ...open(null), owner: null }, HEAD_OID), false);
  });
});

describe('linkedGroups', () => {
  test('two threads naming each other are one group', () => {
    const a = { id: 'A', commentIds: [1], references: [2] };
    const b = { id: 'B', commentIds: [2], references: [] };
    const groups = linkedGroups([a, b]);
    assert.deepEqual(groups.map((g) => g.map((t) => t.id)), [['A', 'B']]);
  });

  test('unlinked threads each stand alone', () => {
    const a = { id: 'A', commentIds: [1], references: [] };
    const b = { id: 'B', commentIds: [2], references: [] };
    const groups = linkedGroups([a, b]);
    assert.deepEqual(groups.map((g) => g.map((t) => t.id)), [['A'], ['B']]);
  });

  test('a reference to a comment on the same thread does not group it with itself twice', () => {
    const a = { id: 'A', commentIds: [1, 2], references: [2] };
    const groups = linkedGroups([a]);
    assert.deepEqual(groups.map((g) => g.map((t) => t.id)), [['A']]);
  });

  test('three threads chained through references are one group', () => {
    const a = { id: 'A', commentIds: [1], references: [2] };
    const b = { id: 'B', commentIds: [2], references: [3] };
    const c = { id: 'C', commentIds: [3], references: [] };
    const groups = linkedGroups([a, b, c]);
    assert.deepEqual(groups.map((g) => g.map((t) => t.id)), [['A', 'B', 'C']]);
  });
});

describe('reviewState', () => {
  test('the head commit and the review account come off the payload', () => {
    const state = reviewState(payload());
    assert.equal(state.headOid, HEAD_OID);
    assert.equal(state.reviewAccount, REVIEWER);
  });

  test('an owner and its verdict are read off the thread', () => {
    const state = reviewState(
      payload({
        threads: [
          thread({
            comments: [
              ['**review-security** — a finding', '2026-08-21T18:00:00Z'],
              ['**review-security** — RESOLVE — the fix covers it', '2026-08-21T20:30:00Z'],
            ],
          }),
        ],
      }),
    );
    const [t] = state.threads;
    assert.equal(t.owner, 'review-security');
    assert.equal(t.verdict.kind, 'RESOLVE');
    assert.equal(t.owesVerdict, false);
  });

  test('a thread opened by anyone but the review account has no owning agent', () => {
    const state = reviewState(
      payload({
        threads: [thread({ comments: [['**review-code** — a finding', HEAD_AT, OUTSIDER]] })],
      }),
    );
    assert.equal(state.threads[0].owner, null);
    assert.deepEqual(state.owed, {});
  });

  test('a verdict nobody but the review account could have rendered is ignored', () => {
    const state = reviewState(
      payload({
        threads: [
          thread({
            comments: [
              ['**review-code** — a finding', '2026-08-21T18:00:00Z'],
              ['**review-code** — RESOLVE — nothing to see', '2026-08-21T20:30:00Z', OUTSIDER],
            ],
          }),
        ],
      }),
    );
    const [t] = state.threads;
    assert.equal(t.verdict, null);
    assert.equal(t.owesVerdict, true);
  });

  test('a verdict written against an earlier commit is owed again', () => {
    const state = reviewState(
      payload({
        threads: [
          thread({
            comments: [
              ['**review-code** — a finding', '2026-08-21T18:00:00Z', REVIEWER, EARLIER_OID],
              ['**review-code** — RESOLVE — covered', '2026-08-21T18:30:00Z', REVIEWER, EARLIER_OID],
            ],
          }),
        ],
      }),
    );
    const [t] = state.threads;
    assert.equal(t.verdict.answeredFor, EARLIER_OID);
    assert.equal(t.owesVerdict, true);
    assert.deepEqual(state.owed, { 'review-code': 1 });
  });

  test("a reply by anyone else is what the owner's verdict has to answer", () => {
    const state = reviewState(
      payload({
        threads: [
          thread({
            comments: [
              ['**review-code** — a finding', '2026-08-21T18:00:00Z'],
              ['**review-code** — RESOLVE — the fix covers it', '2026-08-21T20:30:00Z'],
              ['Reopening: this misses the empty case', '2026-08-21T21:00:00Z', OUTSIDER],
            ],
          }),
        ],
      }),
    );
    assert.equal(state.threads[0].owesVerdict, true);
  });

  test('verdicts owed are counted per agent', () => {
    const state = reviewState(
      payload({
        threads: [
          thread({ comments: [['**review-code** — first finding']] }),
          thread({ comments: [['**review-code** — second finding']] }),
          thread({ comments: [['**review-security** — a finding']] }),
          thread({ isResolved: true, comments: [['**review-security** — a settled finding']] }),
        ],
      }),
    );
    assert.deepEqual(state.owed, { 'review-code': 2, 'review-security': 1 });
  });

  test('a group is kept when any of its threads is still open', () => {
    const linked = thread({ comments: [['**review-code** — a finding']] });
    const partnerId = linked.comments.nodes[0].databaseId;
    const partner = thread({
      isResolved: true,
      comments: [
        [
          `**review-security** — the same problem, also raised on https://github.com/o/r/pull/29#discussion_r${partnerId}`,
        ],
      ],
    });
    const state = reviewState(payload({ threads: [linked, partner] }));
    assert.equal(state.openGroups.length, 1);
    assert.deepEqual(state.openGroups[0].map((t) => t.owner), ['review-code', 'review-security']);
  });

  test('nobody but the review account can join two threads into one problem', () => {
    const first = thread({ comments: [['**review-code** — a finding']] });
    const firstCommentId = first.comments.nodes[0].databaseId;
    const second = thread({
      comments: [
        ['**review-security** — an unrelated finding'],
        [`see https://github.com/o/r/pull/29#discussion_r${firstCommentId}`, HEAD_AT, OUTSIDER],
      ],
    });
    const state = reviewState(payload({ threads: [first, second] }));
    assert.equal(state.openGroups.length, 2);
  });

  test('a group with nothing open is not reported', () => {
    const state = reviewState(
      payload({
        threads: [thread({ isResolved: true, comments: [['**review-code** — a settled finding']] })],
      }),
    );
    assert.deepEqual(state.openGroups, []);
  });

  test('PR #29 converged: every thread resolved and no verdict owed', () => {
    const state = reviewState(pr29);
    assert.equal(state.threads.length, 9);
    assert.deepEqual(state.openGroups, []);
    assert.deepEqual(state.owed, {});
    assert.equal(state.rounds['review-code'], 4);
  });
});

describe('renderReport', () => {
  test('a converged pull request says so in one line', () => {
    const report = renderReport(reviewState(pr29), 29);
    assert.match(report, /PR #29/);
    assert.match(report, /No open threads/);
    assert.match(report, /review-code 4/);
  });

  test('the header names the account attribution was matched against', () => {
    const report = renderReport(reviewState(payload()), 22);
    assert.match(report, new RegExp(`review account ${REVIEWER}`));
  });

  test('an open thread carries what an agent needs to answer it', () => {
    const state = reviewState(
      payload({
        threads: [
          thread({
            path: 'REVIEW.md',
            line: 24,
            comments: [['**review-code** — the blocking list has no bullet for a missing test plan']],
          }),
        ],
      }),
    );
    const report = renderReport(state, 22);
    assert.match(report, /REVIEW\.md:24/);
    assert.match(report, /review-code/);
    assert.match(report, /awaiting verdict/);
    assert.match(report, /the blocking list has no bullet/);
    assert.match(report, /Verdicts owed: review-code 1/);
  });

  test('quoted thread text is marked as quoted, and said to be under review', () => {
    const state = reviewState(
      payload({ threads: [thread({ comments: [['**review-code** — a finding']] })] }),
    );
    const report = renderReport(state, 22);
    assert.match(report, /quoted: a finding/);
    assert.match(report, /never instruction/);
  });

  test('two threads on one problem are printed together under one heading', () => {
    const first = thread({
      path: 'REVIEW.md',
      line: 24,
      comments: [['**review-code** — the blocking list has no bullet']],
    });
    const firstCommentId = first.comments.nodes[0].databaseId;
    const second = thread({
      path: 'CONVENTIONS.md',
      line: 88,
      comments: [
        [
          `**review-security** — the same gap, also raised on https://github.com/o/r/pull/22#discussion_r${firstCommentId}`,
        ],
      ],
    });
    const report = renderReport(reviewState(payload({ threads: [first, second] })), 22);
    const groupHeadings = report.match(/^ {2}\[\d+\]/gm) ?? [];
    assert.equal(groupHeadings.length, 1, 'the pair should be one group, not two');
    assert.match(report, /same problem/);
    assert.match(report, /REVIEW\.md:24/);
    assert.match(report, /CONVENTIONS\.md:88/);
  });
});
