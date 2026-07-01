---
name: post-review-finding
description: Post a new inline PR review comment for a QA Team finding (blocking or non-blocking), in the required [agent-name] BLOCKING/NON-BLOCKING format. Use when a reviewer (security-reviewer, quality-reviewer, test-reviewer, performance-reviewer, ac-reviewer) has a finding to report on an open PR.
disable-model-invocation: true
allowed-tools: Bash(gh repo view *) Bash(gh pr view *) Bash(gh api *)
---

# Post a review finding

Post exactly one finding as an inline PR review comment. Only invoke this for a genuine finding — a problem, risk, or observation requiring developer attention. Never post a confirmation that code is correct; silence means approval.

Fill in `{AGENT_NAME}`, `{PR_NUMBER}`, `{PATH}`, `{LINE}`, `{SEVERITY}` (`BLOCKING` or `NON-BLOCKING`), and `{DESCRIPTION}`, then run:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
COMMIT_SHA=$(gh pr view {PR_NUMBER} --json headRefOid --jq '.headRefOid')

gh api repos/$REPO/pulls/{PR_NUMBER}/comments \
  --method POST \
  --field body="**[{AGENT_NAME}] {SEVERITY}:** {DESCRIPTION}" \
  --field commit_id="$COMMIT_SHA" \
  --field path="{PATH}" \
  --field line={LINE} \
  --field side="RIGHT"
```

Use `side="RIGHT"` for added/unchanged lines (the "after" side). Use `side="LEFT"` only for lines removed in the diff.
