---
name: post-verified-reply
description: Post an in-thread reply confirming a fix addresses a QA Team finding, in the required [agent-name] Verified format. Use when a reviewer has re-read a fixed file and confirmed the fix resolves its own finding, immediately before resolving the thread.
disable-model-invocation: true
allowed-tools: Bash(gh repo view *) Bash(gh api *)
---

# Post a verified reply

The original reviewing agent re-reads the changed code. If the fix is satisfactory, post this confirmation reply, then resolve the thread using `pr-thread-list` (to find the thread's node ID) followed by `pr-thread-resolve`. This skill does not resolve the thread itself.

If the fix introduces a new issue or is incomplete, do not use this skill — post a new finding instead with `post-review-finding`.

Fill in `{AGENT_NAME}`, `{PR_NUMBER}`, `{CONFIRMATION}` (brief confirmation the fix addresses the finding), and `{ORIGINAL_FINDING_COMMENT_ID}`, then run:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

gh api repos/$REPO/pulls/{PR_NUMBER}/comments \
  --method POST \
  --field body="**[{AGENT_NAME}] Verified:** {CONFIRMATION} — thread resolved." \
  --field in_reply_to={ORIGINAL_FINDING_COMMENT_ID}
```
