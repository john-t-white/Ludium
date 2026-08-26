// Makes the calls a round plans, in order, and decides what a failure means
// for the calls after it. Separate from review-post.mjs so the decisions are
// testable without a pull request: `execute` is the only thing that talks to
// GitHub.

/**
 * Sends each step through `execute`, which throws when a call fails.
 *
 * Two failures are not just that one call:
 *
 * - The round's review carries every anchored finding, and GitHub rejects it
 *   whole. Nothing after it is worth sending, because it answers threads that
 *   review was supposed to open.
 * - A resolve names the verdict it depends on. Resolving a thread whose
 *   verdict never posted closes the finding with nothing on the pull request
 *   saying why, and the state tool reports a resolved thread as settled.
 */
export function post(steps, execute) {
  const result = { reviewPosted: false, posted: [], failed: [], skipped: [] };
  const unanswered = new Set();

  for (const step of steps) {
    if (step.dependsOn !== undefined && unanswered.has(step.dependsOn)) {
      result.skipped.push(step.label);
      continue;
    }
    try {
      execute(step);
      result.posted.push(step.label);
      if (step.kind === 'review') result.reviewPosted = true;
    } catch (error) {
      result.failed.push(step.label);
      result.errors = [...(result.errors ?? []), { label: step.label, error }];
      if (step.thread !== undefined) unanswered.add(step.thread);
      if (step.kind === 'review') break;
    }
  }

  return result;
}
