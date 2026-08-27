// Turns one review round into the API calls that post it. Every rule an agent
// used to be told to remember — the name prefix, the severity tag, the anchor,
// the sibling link, the verdict form, one review per round — is applied here,
// so a round that omits one cannot be built rather than being caught later.
//
// Pure: this decides what to post. review-post.mjs posts it.

// The same four the state tool counts rounds for. Kept in one place: a list
// that drifted would have review-post refusing a round review-state counts.
import { AGENTS } from '../review-state/state.mjs';

export { AGENTS };

export const SEVERITIES = ['blocking', 'minor'];

const VERDICTS = ['RESOLVE', "DON'T RESOLVE"];

// GitHub's node id for a review thread. Checked for shape, not just presence:
// it is passed to gh as a field value, and gh reads a value beginning with @
// from a local file and sends its contents to the API.
const THREAD_ID = /^[A-Za-z0-9_=-]+$/;

function required(value, field) {
  if (typeof value === 'string' ? value.trim() === '' : value === undefined || value === null) {
    throw new Error(`${field} is required`);
  }
  return value;
}

// Every comment an agent posts carries its name. The review runs on a human's
// account, so the prefix is the only thing separating an agent from the author
// answering their own thread, and tools/review-state/ reads nothing without it.
const prefixed = (agent, text) => `**${agent}** — ${text}`;

/**
 * A GitHub comment id, checked rather than trusted. Every one of these is
 * interpolated into the endpoint a call is made to, or into a link another
 * tool has to be able to read back, so presence alone is not enough.
 */
function commentId(value, field) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${field} must be a comment id`);
  return value;
}

function findingBody(agent, finding, context) {
  const severity = required(finding.severity, 'finding.severity');
  if (!SEVERITIES.includes(severity)) {
    throw new Error(`finding.severity must be one of ${SEVERITIES.join(', ')}`);
  }
  const tag = finding.fileLevel === true ? `${severity} · file-level` : severity;

  const parts = [
    prefixed(agent, `[${tag}] ${required(finding.wrong, 'finding.wrong')}`),
    required(finding.causes, 'finding.causes'),
    required(finding.recommend, 'finding.recommend'),
  ];

  // The link is what pairs two threads on one problem in the review's report;
  // the comment id written as prose does not, which is how #30's pair came
  // back reported separately.
  if (finding.sibling !== undefined) {
    commentId(finding.sibling, 'finding.sibling');
    const { owner, repo, pr } = context;
    parts.push(
      `Same problem as https://github.com/${owner}/${repo}/pull/${pr}#discussion_r${finding.sibling}`,
    );
  }
  return parts.join('\n\n');
}

/**
 * Which copy of its definition the round ran, as the round record says it.
 *
 * definition.mjs settles this from the instruction text the agent quoted, and
 * a round that matched neither copy says so rather than naming one: the fact
 * worth recording is that the round ran something not checked in.
 */
function definitionSegment(definition) {
  required(definition, 'context.definition');
  const { sha, copies } = definition;
  const matched = copies.length === 0 ? 'matches neither main nor branch' : copies.join(', ');
  return ` · definition ${required(sha, 'context.definition.sha')} (${matched})`;
}

function roundBody(round, findings, context) {
  const count = (severity) => findings.filter((finding) => finding.severity === severity).length;
  const held =
    round.similar === undefined
      ? ''
      : ` (plus ${required(round.similar.count, 'similar.count')} similar: ${required(
          round.similar.about,
          'similar.about',
        )})`;
  return prefixed(
    round.agent,
    `round ${round.round} · ${count('blocking')} blocking, ${count('minor')} minor${held}` +
      `${definitionSegment(context.definition)}. ${required(round.summary, 'summary')}`,
  );
}

/**
 * The calls that post one round, in the order they must be made: the round's
 * own review first, then anything answering a thread that already exists.
 *
 * The review is one call carrying every anchored finding, because GitHub
 * validates a review's comments together and tools/review-state/ counts one
 * prefixed review per round — several reviews would read as several rounds.
 */
export function plan(round, context) {
  if (!AGENTS.includes(round.agent)) {
    throw new Error(`agent must be one of ${AGENTS.join(', ')}`);
  }
  if (!Number.isInteger(round.round) || round.round < 1) {
    throw new Error('round must be a whole number from 1');
  }

  const { owner, repo, pr } = context;
  const pulls = `repos/${owner}/${repo}/pulls/${pr}`;
  const findings = round.findings ?? [];
  const steps = [];

  // From round two the bar is blocking-only, on every material the round sees,
  // fixes included. Exempting what a fix newly added is what turned #31 into
  // seven rounds: every fix is new material, so every fix earned a fresh nit
  // and the loop started again. REVIEW.md states the bar; this is what holds
  // it, before anything reaches the pull request.
  if (round.round > 1) {
    if (findings.some((finding) => finding.severity === 'minor')) {
      throw new Error('a minor finding cannot be raised after round one');
    }
    if (round.similar !== undefined) {
      throw new Error('findings held back are minor, so similar cannot be raised after round one');
    }
  }

  const anchored = [];
  const fileLevel = [];
  for (const finding of findings) {
    const path = required(finding.path, 'finding.path');
    const body = findingBody(round.agent, finding, context);
    if (finding.fileLevel === true) {
      fileLevel.push({ path, body });
    } else {
      if (!Number.isInteger(finding.line) || finding.line < 1) {
        throw new Error('finding.line is required unless the finding is fileLevel');
      }
      anchored.push({ path, line: finding.line, body });
    }
  }

  steps.push({
    kind: 'review',
    label: `round ${round.round} review (${anchored.length} anchored)`,
    endpoint: `${pulls}/reviews`,
    body: { event: 'COMMENT', body: roundBody(round, findings, context), comments: anchored },
  });

  // A file-level comment cannot ride in the review batch, so it is its own
  // call — still a thread this agent owns and can resolve.
  for (const finding of fileLevel) {
    steps.push({
      kind: 'file-finding',
      label: `file-level finding on ${finding.path}`,
      endpoint: `${pulls}/comments`,
      body: {
        commit_id: required(context.headOid, 'context.headOid'),
        path: finding.path,
        subject_type: 'file',
        body: finding.body,
      },
    });
  }

  for (const reply of round.replies ?? []) {
    const comment = commentId(reply.comment, 'reply.comment');
    steps.push({
      kind: 'reply',
      label: `reply on r${comment}`,
      endpoint: `${pulls}/comments/${comment}/replies`,
      body: { body: prefixed(round.agent, required(reply.body, 'reply.body')) },
    });
  }

  let verdicts = 0;
  for (const verdict of round.verdicts ?? []) {
    if (!VERDICTS.includes(verdict.verdict)) {
      throw new Error(`verdict must be one of ${VERDICTS.join(' or ')}`);
    }
    const comment = commentId(verdict.comment, 'verdict.comment');
    const thread = required(verdict.thread, 'verdict.thread');
    if (typeof thread !== 'string' || !THREAD_ID.test(thread)) {
      throw new Error('verdict.thread must be a review thread id');
    }
    const id = `verdict-${(verdicts += 1)}`;
    steps.push({
      kind: 'verdict',
      id,
      label: `${verdict.verdict} on r${comment}`,
      thread,
      endpoint: `${pulls}/comments/${comment}/replies`,
      body: {
        body: prefixed(
          round.agent,
          `${verdict.verdict} — ${required(verdict.because, 'verdict.because')}`,
        ),
      },
    });
    if (verdict.verdict === 'RESOLVE') {
      // Named after the one verdict above, not its thread: resolving a thread
      // whose verdict never posted would close the finding with nothing on the
      // pull request saying why, and the state tool reports a resolved thread
      // as settled. A round may carry a second verdict on the same thread, so
      // the dependency is on this exact call.
      steps.push({
        kind: 'resolve',
        label: `resolve ${thread}`,
        threadId: thread,
        dependsOn: id,
      });
    }
  }

  return steps;
}
