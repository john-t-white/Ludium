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
 *
 * Whitespace is all it forgives. The quote reaches the command as a JSON
 * string through a shell, and a backslash lost on that journey is a changed
 * character like any other: the round records `matches neither`, correctly,
 * for a quote that was faithful before it was escaped.
 */
const normalized = (text) => String(text).replace(FRONTMATTER, '').replace(/\s+/g, ' ').trim();

export function fingerprint(text) {
  return createHash('sha256').update(normalized(text)).digest('hex').slice(0, 12);
}

/**
 * What the quoted text is, against the copies that exist.
 *
 * `copies` is `[{name, text}]` — a copy that could not be read is simply
 * absent. Returns the fingerprint of the definition that ran and the names of
 * the copies it matched, in the order given; an empty list is a definition
 * that is neither, which is recorded rather than refused.
 *
 * A copy matches when the quote *contains* it, not when the two are equal.
 * The harness wraps what it hands an agent — an appended paragraph about the
 * dispatch, which no checked-in copy has — so equality made every honest quote
 * read as `matches neither` and the alarm meant nothing. Where one matching
 * copy contains another, only the longer ran: an agent file edited by
 * appending leaves the base branch's text inside the branch's, and both are in
 * the quote.
 *
 * The recorded fingerprint is the matched copy's, so two agents running one
 * copy record one sha whatever their harness wrapped it in. Nothing matched,
 * and it is the quote's own — there is no copy to name.
 */
export function identify(quoted, copies) {
  const text = normalized(quoted);
  const matched = copies.filter((copy) => text.includes(normalized(copy.text)));
  const ran = matched.filter(
    (copy) =>
      !matched.some(
        (other) =>
          other !== copy &&
          normalized(other.text).length > normalized(copy.text).length &&
          normalized(other.text).includes(normalized(copy.text)),
      ),
  );
  return {
    sha: ran.length === 0 ? fingerprint(quoted) : fingerprint(ran[0].text),
    copies: ran.map((copy) => copy.name),
  };
}
