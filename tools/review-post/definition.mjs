// Identifies which checked-in copy of an agent definition a round actually
// ran, from the instruction text the agent quotes out of its own context.
//
// Reading `.claude/agents/<agent>.md` from disk cannot answer this: a session
// restarted mid-review runs the copy that was loaded when it started, and the
// disk copy is the branch's either way. The agent's loaded text is the only
// evidence there is, so the round hands it over and this decides what it is —
// which is the difference between a fact the tooling records and one the agent
// asserts, and an assertion is what stood wrong for six rounds of #31.
//
// Pure: everything below reads the strings it is handed and nothing else.

import { createHash } from 'node:crypto';

// The frontmatter is the harness's, not the agent's: what reaches an agent is
// the body below it. A quote that includes it and one that does not are the
// same definition.
const FRONTMATTER = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/;

/**
 * A definition's identity, short enough to read in a round record.
 *
 * Whitespace is collapsed before hashing because the text arrives retyped
 * from an agent's context, and rewrapping, indentation, and trailing space are
 * what retyping moves. A changed word still changes the fingerprint, which is
 * the difference this exists to see.
 */
export function fingerprint(text) {
  const normalized = String(text).replace(FRONTMATTER, '').replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

/**
 * What the quoted text is, against the copies that exist.
 *
 * `copies` is `[{name, text}]` — a copy that could not be read is simply
 * absent. Returns the quoted text's fingerprint and the names it matched, in
 * the order given; an empty list is a definition that is neither, which is
 * recorded rather than refused.
 */
export function identify(quoted, copies) {
  const sha = fingerprint(quoted);
  return { sha, copies: copies.filter((copy) => fingerprint(copy.text) === sha).map((c) => c.name) };
}
