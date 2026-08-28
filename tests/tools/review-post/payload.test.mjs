import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { plan } from '../../../tools/review-post/payload.mjs';

const CONTEXT = {
  owner: 'john-t-white',
  repo: 'Ludium',
  pr: 33,
  headOid: 'abc1234def',
};

// The smallest round that is still a round: an agent reporting it looked and
// found nothing. Every case below starts from this and adds one thing.
const ROUND = { agent: 'review-code', round: 1, summary: 'Nothing blocking.' };

const finding = (extra = {}) => ({
  path: 'tools/review-post/payload.mjs',
  line: 42,
  severity: 'blocking',
  wrong: "The cap is read from a field that isn't set.",
  causes: 'Every round posts as if uncapped.',
  recommend: 'Read it from the round instead.',
  ...extra,
});

const only = (steps, kind) => steps.filter((step) => step.kind === kind);
const review = (steps) => only(steps, 'review')[0];

describe('the round review', () => {
  test('is one review, so a round counts as one round', () => {
    const steps = plan({ ...ROUND, findings: [finding(), finding({ line: 43 })] }, CONTEXT);
    assert.equal(only(steps, 'review').length, 1);
    assert.equal(review(steps).body.comments.length, 2);
  });

  test('posts even with nothing found, because a silent round reads as a clean one', () => {
    const steps = plan(ROUND, CONTEXT);
    assert.equal(only(steps, 'review').length, 1);
    assert.deepEqual(review(steps).body.comments, []);
    assert.equal(review(steps).body.event, 'COMMENT');
  });

  // The body is asserted whole rather than matched against, so a round record
  // that grew a segment back — the definition provenance #41 removed, say —
  // fails here rather than passing a looser check.
  test('carries the name prefix, the round, and what the round found', () => {
    const steps = plan(
      { ...ROUND, findings: [finding(), finding({ line: 7, severity: 'minor' })] },
      CONTEXT,
    );
    assert.equal(
      review(steps).body.body,
      '**review-code** — round 1 · 1 blocking, 1 minor. Nothing blocking.',
    );
  });

  test('reports minor findings the cap held back', () => {
    const steps = plan(
      { ...ROUND, similar: { count: 3, about: 'wording in the same file' } },
      CONTEXT,
    );
    assert.equal(
      review(steps).body.body,
      '**review-code** — round 1 · 0 blocking, 0 minor' +
        ' (plus 3 similar: wording in the same file). Nothing blocking.',
    );
  });

  test('goes to the pull request the context names', () => {
    assert.equal(
      review(plan(ROUND, CONTEXT)).endpoint,
      'repos/john-t-white/Ludium/pulls/33/reviews',
    );
  });
});

describe('a finding', () => {
  test('is prefixed, tagged with its severity, and anchored', () => {
    const [comment] = review(plan({ ...ROUND, findings: [finding()] }, CONTEXT)).body.comments;
    assert.equal(comment.path, 'tools/review-post/payload.mjs');
    assert.equal(comment.line, 42);
    assert.equal(
      comment.body,
      "**review-code** — [blocking] The cap is read from a field that isn't set.\n\n" +
        'Every round posts as if uncapped.\n\n' +
        'Read it from the round instead.',
    );
  });

  test('names a sibling thread as a link, which is what pairs the two', () => {
    const [comment] = review(
      plan({ ...ROUND, findings: [finding({ sibling: 3843575153 })] }, CONTEXT),
    ).body.comments;
    assert.match(
      comment.body,
      /Same problem as https:\/\/github\.com\/john-t-white\/Ludium\/pull\/33#discussion_r3843575153$/,
    );
  });

  test('with no line of its own is a file-level comment, said so in the tag', () => {
    const steps = plan(
      { ...ROUND, findings: [finding({ line: undefined, fileLevel: true })] },
      CONTEXT,
    );
    assert.deepEqual(review(steps).body.comments, []);
    const [file] = only(steps, 'file-finding');
    assert.equal(file.endpoint, 'repos/john-t-white/Ludium/pulls/33/comments');
    assert.equal(file.body.subject_type, 'file');
    assert.equal(file.body.commit_id, 'abc1234def');
    assert.match(file.body.body, /^\*\*review-code\*\* — \[blocking · file-level\] /);
  });

  test('is rejected without a line unless it says it is file-level', () => {
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ line: undefined })] }, CONTEXT),
      /line/,
    );
  });

  test('is rejected without a file, because an unanchored finding is not a finding', () => {
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ path: undefined })] }, CONTEXT),
      /path/,
    );
  });

  test('is rejected without all three parts', () => {
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ wrong: undefined })] }, CONTEXT),
      /wrong/,
    );
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ causes: undefined })] }, CONTEXT),
      /causes/,
    );
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ recommend: '' })] }, CONTEXT),
      /recommend/,
    );
  });

  test('is rejected with a line number no diff can have', () => {
    assert.throws(() => plan({ ...ROUND, findings: [finding({ line: 0 })] }, CONTEXT), /line/);
  });

  test('is rejected with a sibling that would not render as a link', () => {
    // #discussion_rnull matches nothing state.mjs reads, so the two threads on
    // one problem would be reported separately with no error anywhere — the
    // failure the sibling field exists to prevent.
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ sibling: null })] }, CONTEXT),
      /sibling/,
    );
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ sibling: 'r123' })] }, CONTEXT),
      /sibling/,
    );
  });

  test('is rejected with a severity the check cannot read', () => {
    assert.throws(
      () => plan({ ...ROUND, findings: [finding({ severity: 'important' })] }, CONTEXT),
      /severity/,
    );
  });

  test('is rejected as minor after round one, whatever the fix newly added', () => {
    assert.throws(
      () => plan({ ...ROUND, round: 2, findings: [finding({ severity: 'minor' })] }, CONTEXT),
      /minor/,
    );
  });

  test('is still minor in round one, which is the only round that takes one', () => {
    const steps = plan({ ...ROUND, findings: [finding({ severity: 'minor' })] }, CONTEXT);
    assert.match(review(steps).body.comments[0].body, /\[minor\]/);
  });

  test('is blocking after round one, which is what a re-review raises', () => {
    const steps = plan({ ...ROUND, round: 2, findings: [finding()] }, CONTEXT);
    assert.equal(review(steps).body.comments.length, 1);
  });
});

describe('a reply', () => {
  test('goes to the thread it answers, prefixed', () => {
    const [reply] = only(
      plan(
        { ...ROUND, replies: [{ comment: 123456, body: 'Still reachable from the CLI.' }] },
        CONTEXT,
      ),
      'reply',
    );
    assert.equal(reply.endpoint, 'repos/john-t-white/Ludium/pulls/33/comments/123456/replies');
    assert.equal(reply.body.body, '**review-code** — Still reachable from the CLI.');
  });

  test('is rejected without the comment it replies to', () => {
    assert.throws(() => plan({ ...ROUND, replies: [{ body: 'x' }] }, CONTEXT), /comment/);
  });

  test('is rejected when the comment is not a comment id', () => {
    // The id is interpolated into the endpoint the reply is posted to, so a
    // value that is not one addresses something other than the thread.
    for (const comment of [0, '123', '../../user', null]) {
      assert.throws(() => plan({ ...ROUND, replies: [{ comment, body: 'x' }] }, CONTEXT), /comment/);
    }
  });
});

describe('a verdict', () => {
  const verdict = (extra = {}) => ({
    thread: 'PRRT_kwDO1',
    comment: 123456,
    verdict: 'RESOLVE',
    because: 'The cap now comes from the round.',
    ...extra,
  });

  test('is a reply in the form the state tool reads, and resolves the thread', () => {
    const steps = plan({ ...ROUND, verdicts: [verdict()] }, CONTEXT);
    const [reply] = only(steps, 'verdict');
    assert.equal(reply.endpoint, 'repos/john-t-white/Ludium/pulls/33/comments/123456/replies');
    assert.equal(reply.body.body, '**review-code** — RESOLVE — The cap now comes from the round.');
    // The resolve names the verdict it depends on, so a verdict that fails to
    // post cannot leave the thread resolved with nothing on it.
    const [resolve] = only(steps, 'resolve');
    assert.equal(resolve.threadId, 'PRRT_kwDO1');
    assert.equal(resolve.dependsOn, reply.id);
    assert.equal(reply.thread, 'PRRT_kwDO1');
  });

  test('is rejected when the thread is not a thread id', () => {
    // gh reads a -F value beginning with @ from a local file and sends it to
    // the API, so a thread id is checked for shape, not just presence.
    for (const thread of ['@C:/Windows/win.ini', '', 42, 'PRRT_ bad']) {
      assert.throws(() => plan({ ...ROUND, verdicts: [verdict({ thread })] }, CONTEXT), /thread/);
    }
  });

  test("leaves the thread open when it is DON'T RESOLVE", () => {
    const steps = plan(
      { ...ROUND, verdicts: [verdict({ verdict: "DON'T RESOLVE", because: 'Still unset.' })] },
      CONTEXT,
    );
    assert.equal(
      only(steps, 'verdict')[0].body.body,
      "**review-code** — DON'T RESOLVE — Still unset.",
    );
    assert.deepEqual(only(steps, 'resolve'), []);
  });

  test('is rejected in any other form', () => {
    assert.throws(
      () => plan({ ...ROUND, verdicts: [verdict({ verdict: 'resolved' })] }, CONTEXT),
      /verdict/,
    );
    assert.throws(
      () => plan({ ...ROUND, verdicts: [verdict({ because: undefined })] }, CONTEXT),
      /because/,
    );
  });
});

describe('the round itself', () => {
  test('is rejected from an agent the review does not have', () => {
    assert.throws(() => plan({ ...ROUND, agent: 'review-everything' }, CONTEXT), /agent/);
  });

  test('is rejected without a summary, since the body is the record the round ran', () => {
    assert.throws(() => plan({ ...ROUND, summary: '' }, CONTEXT), /summary/);
  });

  test('is rejected without a round number', () => {
    assert.throws(() => plan({ ...ROUND, round: 0 }, CONTEXT), /round/);
  });

  test('is rejected with findings held back after round one, since those are minor too', () => {
    assert.throws(
      () => plan({ ...ROUND, round: 2, similar: { count: 2, about: 'wording' } }, CONTEXT),
      /minor/,
    );
  });

  test('posts the review before anything that answers an existing thread', () => {
    const steps = plan(
      {
        ...ROUND,
        findings: [finding({ line: undefined, fileLevel: true })],
        replies: [{ comment: 1, body: 'x' }],
        verdicts: [{ thread: 'T', comment: 2, verdict: 'RESOLVE', because: 'y' }],
      },
      CONTEXT,
    );
    assert.deepEqual(
      steps.map((step) => step.kind),
      ['review', 'file-finding', 'reply', 'verdict', 'resolve'],
    );
  });
});
