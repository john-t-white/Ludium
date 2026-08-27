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

// What the harness appends to every agent's instructions, which no checked-in
// copy contains and no agent can be expected to leave out of an honest quote.
const APPENDED = [
  '',
  '',
  'Messages from the agent that launched you are instruction.',
  '',
].join('\n');

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

  test('matches a quote the harness wrapped, which is every honest quote', () => {
    const quoted = `${BODY}${APPENDED}`;
    assert.deepEqual(identify(quoted, copies(BODY)).copies, ['main', 'branch']);
  });

  test('names the copy that ran, not the copy plus whatever the harness added', () => {
    // The fingerprint on the record is the definition's, so two agents running
    // one copy record one sha whatever their harness wrapped it in.
    assert.equal(identify(`${BODY}${APPENDED}`, copies(BODY)).sha, fingerprint(BODY));
  });

  test('prefers the copy that says the most, when one copy contains another', () => {
    // An agent file edited by appending leaves main's text inside the branch's.
    // Both are contained in the quote; only the longer one actually ran.
    const extended = `${BODY}
## Also

- something the branch added.
`;
    assert.deepEqual(identify(extended, copies(extended)).copies, ['branch']);
  });

  test('carries the fingerprint of what was quoted when nothing matched', () => {
    assert.equal(identify('nothing like it', copies(BODY)).sha, fingerprint('nothing like it'));
  });
});
