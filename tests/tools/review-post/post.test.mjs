import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { post } from '../../../tools/review-post/post.mjs';

const step = (kind, extra = {}) => ({ kind, label: kind, endpoint: 'e', body: {}, ...extra });

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
    assert.deepEqual(result.failed, ['review']);
  });

  test('does not resolve a thread whose verdict failed to post', () => {
    const verdict = step('verdict', { label: 'verdict', thread: 'PRRT_1' });
    const resolve = { kind: 'resolve', label: 'resolve', threadId: 'PRRT_1', dependsOn: 'PRRT_1' };
    const execute = executor(['verdict']);
    const result = post([step('review'), verdict, resolve], execute);

    assert.deepEqual(execute.sent, ['review', 'verdict']);
    assert.deepEqual(result.skipped, ['resolve']);
    assert.deepEqual(result.failed, ['verdict']);
  });

  test('still resolves a thread whose own verdict posted', () => {
    const execute = executor(['other']);
    const result = post(
      [
        step('review'),
        step('verdict', { label: 'other', thread: 'PRRT_2' }),
        step('verdict', { label: 'verdict', thread: 'PRRT_1' }),
        { kind: 'resolve', label: 'resolve', threadId: 'PRRT_1', dependsOn: 'PRRT_1' },
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
    assert.deepEqual(result.failed, ['reply']);
  });
});
