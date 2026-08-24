// Establishes the facts a review round needs: whose thread is whose, which
// are still open, who owes a verdict on each, and which round each agent is
// on. All of it is mechanical — a flag, a name prefix, a timestamp comparison
// — so it is settled here rather than by an agent reading the pull request.
//
// Pure: everything below reads the GraphQL payload it is handed and nothing
// else. Fetching that payload is review-state.mjs's job.

export const AGENTS = [
  'review-acceptance-criteria',
  'review-code',
  'review-security',
  'review-test-plan',
];

const OWNER_PREFIX = /^\s*\*\*(review-[a-z-]+)\*\*/;
const REFERENCE = /#discussion_r(\d+)/g;

// Agents write DON'T with a typewriter apostrophe; GitHub clients sometimes
// substitute a curly one. Both mean the same verdict.
const normalize = (body) => (body ?? '').replace(/’/g, "'");

/** The agent that owns a comment, or null when nobody prefixed it. */
export function ownerOf(body) {
  const match = OWNER_PREFIX.exec(body ?? '');
  const name = match?.[1];
  return AGENTS.includes(name) ? name : null;
}

/** The round an agent is about to run: one past the rounds it has posted. */
export function roundFor(agent, reviews) {
  return reviews.filter((review) => ownerOf(review.body) === agent).length + 1;
}

/** The verdict a comment renders, or null when it renders none. */
export function verdictIn(body) {
  const text = normalize(body);
  if (text.includes("DON'T RESOLVE")) return "DON'T RESOLVE";
  if (text.includes('RESOLVE')) return 'RESOLVE';
  return null;
}

/**
 * Whether the owning agent still owes a verdict this round. A verdict
 * rendered before the head commit judged an earlier state of the branch, so
 * it does not answer for the fix that has landed since.
 */
export function owesVerdict(thread, headCommittedDate) {
  if (thread.isResolved || thread.owner === null) return false;
  if (thread.verdict === null) return true;
  return thread.verdict.at < headCommittedDate;
}

/**
 * Threads grouped by the problem they are about. Two agents raising one
 * problem file two threads by design, and the second names the first by
 * linking its comment; that link is what joins them here. Threads nothing
 * links stand alone, and input order is kept.
 */
export function linkedGroups(threads) {
  const byComment = new Map();
  for (const thread of threads) {
    for (const commentId of thread.commentIds) byComment.set(commentId, thread.id);
  }

  const neighbours = new Map(threads.map((thread) => [thread.id, new Set()]));
  for (const thread of threads) {
    for (const reference of thread.references) {
      const other = byComment.get(reference);
      if (other === undefined || other === thread.id) continue;
      neighbours.get(thread.id).add(other);
      neighbours.get(other).add(thread.id);
    }
  }

  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const seen = new Set();
  const groups = [];
  for (const thread of threads) {
    if (seen.has(thread.id)) continue;
    const group = [];
    const pending = [thread.id];
    while (pending.length > 0) {
      const id = pending.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(byId.get(id));
      for (const next of neighbours.get(id)) pending.push(next);
    }
    groups.push(group);
  }
  return groups;
}

function normalizeThread(node) {
  const comments = node.comments.nodes;
  const first = comments[0];
  const owner = ownerOf(first?.body);

  const references = [];
  for (const comment of comments) {
    // Only bodies: every comment's own url ends in #discussion_r<its own id>,
    // and reading that back would make each thread reference itself.
    for (const match of normalize(comment.body).matchAll(REFERENCE)) {
      references.push(Number(match[1]));
    }
  }

  const verdicts = comments
    .filter((comment) => ownerOf(comment.body) === owner && verdictIn(comment.body) !== null)
    .map((comment) => ({ kind: verdictIn(comment.body), at: comment.createdAt }));

  return {
    id: node.id,
    isResolved: node.isResolved,
    path: node.path,
    line: node.line,
    owner,
    url: first?.url ?? null,
    commentId: first?.databaseId ?? null,
    summary: summarize(first?.body),
    commentIds: comments.map((comment) => comment.databaseId),
    references,
    verdict: verdicts.at(-1) ?? null,
  };
}

function summarize(body) {
  const line = normalize(body).split('\n')[0].replace(OWNER_PREFIX, '').replace(/^\s*[—-]\s*/, '');
  return line.length > 100 ? `${line.slice(0, 97)}...` : line;
}

/** Everything a round needs to know about a pull request's review so far. */
export function reviewState(payload) {
  const pr = payload.data.repository.pullRequest;
  const reviews = pr.reviews.nodes;
  const threads = pr.reviewThreads.nodes.map(normalizeThread);
  const headCommittedDate = pr.commits.nodes[0].commit.committedDate;

  for (const thread of threads) {
    thread.owesVerdict = owesVerdict(thread, headCommittedDate);
  }

  const owed = {};
  for (const thread of threads) {
    if (thread.owesVerdict) owed[thread.owner] = (owed[thread.owner] ?? 0) + 1;
  }

  const rounds = Object.fromEntries(
    AGENTS.map((agent) => [agent, roundFor(agent, reviews)]),
  );

  // A resolved thread is kept in a group that still has an open one: a human
  // reading the open thread is shown the other angle on the same problem,
  // whether or not that one is settled.
  const openGroups = linkedGroups(threads).filter((group) =>
    group.some((thread) => !thread.isResolved),
  );

  return {
    headOid: pr.headRefOid,
    headCommittedDate,
    rounds,
    threads,
    openGroups,
    owed,
  };
}

const anchor = (thread) => (thread.line === null ? thread.path : `${thread.path}:${thread.line}`);

function status(thread) {
  if (thread.isResolved) return 'resolved';
  if (thread.owner === null) return 'no owning agent';
  if (thread.owesVerdict) {
    return thread.verdict === null
      ? 'awaiting verdict'
      : `awaiting verdict (${thread.verdict.kind} predates the head commit)`;
  }
  return thread.verdict.kind;
}

/** The state as one report, for a human and for the dispatch that follows. */
export function renderReport(state, prNumber) {
  const lines = [
    `PR #${prNumber} — head ${state.headOid.slice(0, 7)} (${state.headCommittedDate})`,
    `Next round: ${AGENTS.map((agent) => `${agent} ${state.rounds[agent]}`).join(', ')}`,
    '',
  ];

  if (state.openGroups.length === 0) {
    lines.push('No open threads.');
  } else {
    lines.push(`Open threads (${state.openGroups.length}):`, '');
    state.openGroups.forEach((group, index) => {
      const heading = group.map(anchor).join(' + ');
      const suffix = group.length > 1 ? ` — same problem, ${group.length} threads` : '';
      lines.push(`  [${index + 1}] ${heading}${suffix}`);
      for (const thread of group) {
        lines.push(`      ${thread.owner ?? 'unowned'} — ${status(thread)}`);
        lines.push(`        thread ${thread.id} · comment r${thread.commentId}`);
        lines.push(`        ${thread.summary}`);
      }
      lines.push('');
    });
  }

  const owed = Object.entries(state.owed);
  lines.push(
    '',
    owed.length === 0
      ? 'Verdicts owed: none'
      : `Verdicts owed: ${owed.map(([agent, count]) => `${agent} ${count}`).join(', ')}`,
  );
  return lines.join('\n');
}
