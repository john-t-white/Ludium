# QA Team — Review Agent Team

The QA Team is involved twice in every change: once to review the **plan** and once to review the **implementation**. Reviewers never write or modify code — they read, assess, and report findings to the lead. See `.claude/workflow.md` for when and how the QA Team is spawned at each phase.

## Team Members

| Name | Agent Type | Review Lens | Model | Can Write Code |
|---|---|---|---|---|
| `security-reviewer` | `security-engineer` | Vulnerabilities, auth, secrets, OWASP top 10 | Sonnet | No |
| `quality-reviewer` | `quality-reviewer` | Bugs, logic errors, edge cases, correctness; unit tests pass and code coverage is adequate | Sonnet | No |
| `test-reviewer` | `qa-engineer` | Test coverage, test quality, missing cases | Sonnet | No |
| `performance-reviewer` | `performance-reviewer` | Bottlenecks, inefficiencies, scalability | Sonnet | No |
| `ac-reviewer` | `ac-reviewer` | Acceptance criteria and requirements validation | Haiku | No |

**Plan-review passes (Phase 2)** are checklist-style: reviewers assess a proposed plan, not actual code. Use `haiku` for `quality-reviewer`, `test-reviewer`, and `ac-reviewer` in Phase 2 to reduce cost. Always use Sonnet for `security-reviewer` and `performance-reviewer` regardless of phase.

**Tier-based activation** — which reviewers to spawn is determined by the change tier (see `workflow.md`). Not all reviewers run on every change.

## Rules

- **Read-only**: no QA Team member may edit or create files. Findings are reported to the lead only.
- **Always report before going idle**: every reviewer must send a summary message to the lead before going idle — never go idle without reporting findings. If the lead follows up after an idle notification with no prior report, respond immediately.
- **Direct communication**: reviewers message each other by name when a finding spans multiple lenses.
- **Blocking findings**: the lead must resolve all blocking findings before proceeding to the next phase.
- **Non-blocking findings**: recorded and included in the PR description but do not delay progress.
- **Security reviews pre-push**: `security-reviewer` always runs against the local branch before the branch is pushed. It reads `git diff main..HEAD` and changed files directly — no PR exists yet, so findings go to the lead only, never as PR comments.
- **Inline PR comments**: quality, test, performance, and ac reviewers run post-push and post every finding as an inline comment on the specific line in the open PR. Each comment must begin with `**[agent-name] BLOCKING:**` or `**[agent-name] NON-BLOCKING:**` followed by the finding description. **Only post when there is a genuine finding** — a problem, risk, or meaningful observation requiring developer attention. Do not post confirmations that code is correct; silence means approval.
- **Thread resolution**: after a blocking finding is fixed, the original reviewing agent must re-read the changed code, verify the fix, and resolve the GitHub review thread. Do not resolve a thread without re-reading the code.
