---
name: post-pr-summary
description: Post a general, non-line-anchored comment to a PR's conversation (not a line-specific review comment). Use for things like test-reviewer's pass/fail test summary that aren't tied to a specific file/line.
disable-model-invocation: true
allowed-tools: Bash(gh pr comment *)
---

# Post a PR summary comment

Use this for a comment that applies to the PR as a whole rather than a specific line — e.g. a test pass/fail summary from `run-tests`. This posts to the PR's conversation, not as a review-line comment (see `post-review-finding` for line-anchored findings instead).

Fill in `{PR_NUMBER}` and `{BODY}`, then run:

```bash
gh pr comment {PR_NUMBER} --body "{BODY}"
```
