---
name: pr-thread-list
description: List a pull request's review threads (node id, resolved status, path, line, first comment body) via the GitHub GraphQL API. Use to find a thread's node ID before resolving it, or to check overall review-thread status on a PR.
disable-model-invocation: true
allowed-tools: Bash(gh repo view *) Bash(gh api graphql *)
---

# List PR review threads

Fill in `{PR_NUMBER}`, then run:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
OWNER=$(echo $REPO | cut -d/ -f1)
REPO_NAME=$(echo $REPO | cut -d/ -f2)

gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { body path line }
          }
        }
      }
    }
  }
}' -f owner="$OWNER" -f repo="$REPO_NAME" -F pr={PR_NUMBER}
```

Match the thread you need by its first comment's `path`/`line`/`body`, then pass its `id` to `pr-thread-resolve`.
