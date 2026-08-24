import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ownerOf,
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

// Builds the shape reviewState reads, so a test states only what it is about.
function payload({ reviews = [], threads = [], headAt = HEAD_AT } = {}) {
  return {
    data: {
      repository: {
        pullRequest: {
          headRefOid: 'abc1234def',
          commits: { nodes: [{ commit: { committedDate: headAt } }] },
          reviews: { nodes: reviews.map((body) => ({ body, submittedAt: headAt })) },
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
      nodes: comments.map(([body, createdAt = HEAD_AT], i) => {
        const databaseId = nextId * 1000 + i;
        return {
          databaseId,
          url: `https://github.com/o/r/pull/29#discussion_r${databaseId}`,
          createdAt,
          body,
          author: { login: 'john-t-white' },
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

describe('roundFor', () => {
  test('the next round is one past the rounds an agent has posted', () => {
    const reviews = [
      { body: '**review-code** — round 1. Two findings.' },
      { body: '**review-security** — round 1. No findings.' },
      { body: '**review-code** — round 2. One finding.' },
    ];
    assert.equal(roundFor('review-code', reviews), 3);
    assert.equal(roundFor('review-security', reviews), 2);
    assert.equal(roundFor('review-test-plan', reviews), 1);
  });

  test('the empty-bodied reviews GitHub records for replies are not rounds', () => {
    const reviews = [{ body: '' }, { body: '**review-code** — round 1.' }, { body: '' }];
    assert.equal(roundFor('review-code', reviews), 2);
  });

  test('agents count their own rounds independently on the real PR #29', () => {
    const reviews = pr29.data.repository.pullRequest.reviews.nodes;
    assert.equal(roundFor('review-code', reviews), 4);
    assert.equal(roundFor('review-security', reviews), 3);
    assert.equal(roundFor('review-acceptance-criteria', reviews), 3);
    assert.equal(roundFor('review-test-plan', reviews), 3);
  });
});

describe('verdictIn', () => {
  test('reads both verdicts', () => {
    assert.equal(verdictIn("**review-code** — RESOLVE — the fix covers it"), 'RESOLVE');
    assert.equal(verdictIn("**review-code** — DON'T RESOLVE — still missing"), "DON'T RESOLVE");
  });

  test("DON'T RESOLVE is not read as RESOLVE, whichever apostrophe was typed", () => {
    assert.equal(verdictIn("DON'T RESOLVE — still missing"), "DON'T RESOLVE");
    assert.equal(verdictIn('DON’T RESOLVE — still missing'), "DON'T RESOLVE");
  });

  test('a finding that carries no verdict is not one', () => {
    assert.equal(verdictIn('**review-code** — the blocking list has no bullet'), null);
  });
});

describe('owesVerdict', () => {
  const owner = 'review-code';

  test('an unresolved thread with no verdict on it owes one', () => {
    const t = { isResolved: false, owner, verdict: null };
    assert.equal(owesVerdict(t, HEAD_AT), true);
  });

  test('a verdict rendered before the head commit does not count for this round', () => {
    const t = { isResolved: false, owner, verdict: { kind: "DON'T RESOLVE", at: '2026-08-21T19:00:00Z' } };
    assert.equal(owesVerdict(t, HEAD_AT), true);
  });

  test('a verdict rendered after the head commit settles the round', () => {
    const t = { isResolved: false, owner, verdict: { kind: "DON'T RESOLVE", at: '2026-08-21T20:30:00Z' } };
    assert.equal(owesVerdict(t, HEAD_AT), false);
  });

  test('a resolved thread owes nothing', () => {
    const t = { isResolved: true, owner, verdict: null };
    assert.equal(owesVerdict(t, HEAD_AT), false);
  });

  test('a thread no agent owns is never asked for a verdict', () => {
    const t = { isResolved: false, owner: null, verdict: null };
    assert.equal(owesVerdict(t, HEAD_AT), false);
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
  test('a comment URL is not read as that comment referencing itself', () => {
    const state = reviewState(
      payload({ threads: [thread({ comments: [['**review-code** — a finding']] })] }),
    );
    assert.equal(state.openGroups.length, 1);
    assert.equal(state.openGroups[0].length, 1);
  });

  test('the head commit date comes from the last commit', () => {
    const state = reviewState(payload({ headAt: '2026-01-02T03:04:05Z' }));
    assert.equal(state.headCommittedDate, '2026-01-02T03:04:05Z');
    assert.equal(state.headOid, 'abc1234def');
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
