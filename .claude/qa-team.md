# QA Team — Review Agent Team

The QA Team is involved twice in every change: once to review the **plan** and once to review the **implementation**. Reviewers never write or modify code — they read, assess, and report findings to the lead. See `.claude/workflow.md` for when and how the QA Team is spawned at each phase.

## Team Members

| Name | Agent Type | Review Lens | Can Write Code |
|---|---|---|---|
| `security-reviewer` | `security-engineer` | Vulnerabilities, auth, secrets, OWASP top 10 | No |
| `quality-reviewer` | `quality-reviewer` | Bugs, logic errors, edge cases, correctness; unit tests pass and code coverage is adequate | No |
| `test-reviewer` | `qa-engineer` | Test coverage, test quality, missing cases | No |
| `performance-reviewer` | `performance-reviewer` | Bottlenecks, inefficiencies, scalability | No |
| `ac-reviewer` | `ac-reviewer` | Acceptance criteria and requirements validation | No |

## Rules

- **Read-only**: no QA Team member may edit or create files. Findings are reported to the lead only.
- **Direct communication**: reviewers message each other by name when a finding spans multiple lenses.
- **Blocking findings**: the lead must resolve all blocking findings before proceeding to the next phase.
- **Non-blocking findings**: recorded and included in the PR description but do not delay progress.
- **Security reviews pre-push**: `security-reviewer` always runs against the local branch before the branch is pushed. It reads `git diff main..HEAD` and changed files directly — no PR exists yet, so findings go to the lead only, never as PR comments.
- **Inline PR comments**: quality, test, performance, and ac reviewers run post-push and post every finding as an inline comment on the specific line in the open PR. Each comment must begin with `**[agent-name] BLOCKING:**` or `**[agent-name] NON-BLOCKING:**` followed by the finding description.
- **Thread resolution**: after a blocking finding is fixed, the original reviewing agent must re-read the changed code, verify the fix, and resolve the GitHub review thread. Do not resolve a thread without re-reading the code.
