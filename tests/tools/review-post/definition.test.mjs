import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { fingerprint, identify } from '../../../tools/review-post/definition.mjs';

// What an agent hands over is its own instruction text, retyped from context
// rather than copied off disk, so the fingerprint has to survive the ways
// retyping moves text around without surviving a change to what it says.
const BODY = `You are the general code reviewer for one pull request.

## Look for

- **Correctness** — boundary conditions and error paths.
`;

const WITH_FRONTMATTER = `---
name: review-code
model: opus
---

${BODY}`;

describe('fingerprint', () => {
  test('is twelve lowercase hex digits', () => {
    assert.match(fingerprint(BODY), /^[0-9a-f]{12}$/);
  });

  test('survives line endings, indentation, and trailing space', () => {
    const retyped = BODY.replace(/\n/g, '\r\n')
      .replace(/^- /m, '   -  ')
      .replace(/\.$/m, '.   ');
    assert.equal(fingerprint(retyped), fingerprint(BODY));
  });

  test('survives the frontmatter an agent never receives', () => {
    assert.equal(fingerprint(WITH_FRONTMATTER), fingerprint(BODY));
  });

  test('does not survive a changed word, which is the whole point', () => {
    assert.notEqual(fingerprint(BODY.replace('boundary', 'edge')), fingerprint(BODY));
  });
});

describe('identify', () => {
  const copies = (branchText) => [
    { name: 'main', text: BODY },
    { name: 'branch', text: branchText },
  ];

  test('names both copies when they agree', () => {
    assert.deepEqual(identify(BODY, copies(BODY)).copies, ['main', 'branch']);
  });

  test('names the one copy the text ran, when they differ', () => {
    const edited = BODY.replace('boundary', 'edge');
    assert.deepEqual(identify(edited, copies(edited)).copies, ['branch']);
    assert.deepEqual(identify(BODY, copies(edited)).copies, ['main']);
  });

  test('names none when the text ran neither', () => {
    assert.deepEqual(identify(BODY.replace('one pull request', 'two'), copies(BODY)).copies, []);
  });

  test('carries the fingerprint of what was quoted, matched or not', () => {
    assert.equal(identify(BODY, copies(BODY)).sha, fingerprint(BODY));
    assert.equal(identify('nothing like it', copies(BODY)).sha, fingerprint('nothing like it'));
  });
});
