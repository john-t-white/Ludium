---
name: post-fix-reply
description: Post an in-thread reply describing a fix for a QA Team finding, in the required [agent-name] Fix format. Use when a Dev Team member has just fixed and pushed a fix for a blocking finding on an open PR.
disable-model-invocation: true
allowed-tools: Bash(gh repo view *) Bash(gh api *)
---

# Post a fix reply

After pushing a fix for a finding, reply in the same review thread describing what changed. Do not resolve the thread yourself — the original reviewer verifies and resolves it (see `post-verified-reply`, `pr-thread-list`, `pr-thread-resolve`).

Fill in `{AGENT_NAME}` (the Dev Team member posting, e.g. `backend-dev`), `{FINDING_AGENT_NAME}` (the reviewer who raised the finding), `{PR_NUMBER}`, `{PATH}`, `{LINE}`, `{DESCRIPTION}` (what changed and why), and `{ORIGINAL_FINDING_COMMENT_ID}`, then run:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

gh api repos/$REPO/pulls/{PR_NUMBER}/comments \
  --method POST \
  --field body="**[{AGENT_NAME}] Fix for [{FINDING_AGENT_NAME}] finding on {PATH}:{LINE}:** {DESCRIPTION}" \
  --field in_reply_to={ORIGINAL_FINDING_COMMENT_ID}
```
