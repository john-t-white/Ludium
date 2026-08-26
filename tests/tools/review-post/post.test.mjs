import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { post } from '../../../tools/review-post/post.mjs';

const step = (kind, extra = {}) => ({ kind, label: kind, endpoint: 'e', body: {}, ...extra });

const labels = (failed) => failed.map((failure) => failure.label);

// Records what it was asked to send, and fails whichever labels it is told to.
function executor(failing = []) {
  const sent = [];
  const execute = (item) => {
    sent.push(item.label);
    if (failing.includes(item.label)) throw new Error(`${item.label} rejected`);
  };
  execute.sent = sent;
  return execute;
}

describe('posting a round', () => {
  test('makes every call when nothing fails', () => {
    const execute = executor();
    const result = post([step('review'), step('reply'), step('verdict')], execute);
    assert.deepEqual(execute.sent, ['review', 'reply', 'verdict']);
    assert.deepEqual(result.failed, []);
    assert.equal(result.reviewPosted, true);
  });

  test('stops at a rejected review, because that round posted nothing at all', () => {
    const execute = executor(['review']);
    const result = post([step('review'), step('reply')], execute);
    assert.deepEqual(execute.sent, ['review']);
    assert.equal(result.reviewPosted, false);
    assert.deepEqual(labels(result.failed), ['review']);
    assert.match(result.failed[0].error.message, /review rejected/);
  });

  test('does not resolve a thread whose verdict failed to post', () => {
    const verdict = step('verdict', { id: 'verdict-1', label: 'verdict', thread: 'PRRT_1' });
    const resolve = { kind: 'resolve', label: 'resolve', threadId: 'PRRT_1', dependsOn: 'verdict-1' };
    const execute = executor(['verdict']);
    const result = post([step('review'), verdict, resolve], execute);

    assert.deepEqual(execute.sent, ['review', 'verdict']);
    assert.deepEqual(result.skipped, ['resolve']);
    assert.deepEqual(labels(result.failed), ['verdict']);
  });

  test('still resolves a thread whose own verdict posted', () => {
    const execute = executor(['other']);
    const result = post(
      [
        step('review'),
        step('verdict', { id: 'verdict-1', label: 'other', thread: 'PRRT_2' }),
        step('verdict', { id: 'verdict-2', label: 'verdict', thread: 'PRRT_1' }),
        { kind: 'resolve', label: 'resolve', threadId: 'PRRT_1', dependsOn: 'verdict-2' },
      ],
      execute,
    );
    assert.deepEqual(execute.sent, ['review', 'other', 'verdict', 'resolve']);
    assert.deepEqual(result.skipped, []);
  });

  test('keeps going after a failure that nothing else depends on', () => {
    const execute = executor(['reply']);
    const result = post([step('review'), step('reply'), step('file-finding')], execute);
    assert.deepEqual(execute.sent, ['review', 'reply', 'file-finding']);
    assert.deepEqual(labels(result.failed), ['reply']);
    // The pair the CLI branches on: the round is on the pull request, so
    // posting it again would post a second review.
    assert.equal(result.reviewPosted, true);
  });

  test('skips only the resolve for the verdict that failed, not the thread', () => {
    // One round can carry two verdicts on one thread. Keyed by thread, a
    // failure on either would strand the resolve for the one that posted.
    const execute = executor(['first']);
    const result = post(
      [
        step('review'),
        step('verdict', { id: 'verdict-1', label: 'first', thread: 'PRRT_1' }),
        step('verdict', { id: 'verdict-2', label: 'second', thread: 'PRRT_1' }),
        { kind: 'resolve', label: 'resolve', threadId: 'PRRT_1', dependsOn: 'verdict-2' },
      ],
      execute,
    );
    assert.deepEqual(execute.sent, ['review', 'first', 'second', 'resolve']);
    assert.deepEqual(result.skipped, []);
  });
});
