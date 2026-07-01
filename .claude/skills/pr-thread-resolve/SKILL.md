---
name: pr-thread-resolve
description: Resolve a specific GitHub PR review thread by its GraphQL node ID. Use after posting a verified-fix reply (post-verified-reply) and looking up the thread's node ID with pr-thread-list.
disable-model-invocation: true
allowed-tools: Bash(gh api graphql *)
---

# Resolve a PR review thread

Fill in `{THREAD_NODE_ID}` (from `pr-thread-list`), then run:

```bash
gh api graphql -f query='
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread { isResolved }
  }
}' -f threadId="{THREAD_NODE_ID}"
```
