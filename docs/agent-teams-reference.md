# Agent Teams Reference Guide

Master reference for building effective agent teams with Claude Code. Source: https://code.claude.com/docs/en/agent-teams (as of v2.1.186).

---

## Enabling Agent Teams

```json
// .claude/settings.json or ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Without this flag: no team is set up, no team directories are written, Claude will not spawn or propose teammates.

---

## When to Use Agent Teams vs. Alternatives

### Use Agent Teams When
- Multiple teammates can work **independently** (no shared file writes, no ordering dependencies)
- Tasks benefit from parallel exploration: research, review, competing hypotheses, cross-layer changes
- You want teammates to **communicate directly** with each other, not just report back

### Use Subagents Instead When
- Workers only need to report results back (no inter-agent coordination needed)
- Tasks are sequential or have many dependencies
- Cost is a concern (subagents are significantly cheaper — each teammate is a full Claude instance)
- Same-file edits or tightly-coupled work

### Use Git Worktrees Instead When
- You want to run multiple sessions manually without automated team coordination

### Decision Table

| Factor | Subagents | Agent Teams |
|---|---|---|
| Context | Own window; result returns to caller | Own window; fully independent |
| Communication | Report back to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Token cost | Lower | Higher (scales linearly per teammate) |
| Best for | Focused tasks, result is what matters | Complex work needing discussion & collaboration |

---

## Architecture

### Components

| Component | Role |
|---|---|
| **Team lead** | The main Claude Code session; spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances, each with their own context window |
| **Task list** | Shared work items that teammates claim and complete |
| **Mailbox** | Messaging system for direct inter-agent communication |

### Storage Paths

- **Team config** (runtime, auto-removed on exit): `~/.claude/teams/session-{8-char-session-id}/config.json`
- **Task list** (persists for resumed sessions): `~/.claude/tasks/session-{8-char-session-id}/`

> Do not hand-edit the team config — it is overwritten on every state update.

### Task States

`pending` → `in progress` → `completed`

Tasks can have **dependencies**. A pending task with unresolved dependencies cannot be claimed until those dependencies complete. Dependency unblocking is automatic.

Task claiming uses **file locking** to prevent race conditions.

---

## Context and Communication

### What Teammates Inherit at Spawn
- Project context: `CLAUDE.md`, MCP servers, skills
- The spawn prompt from the lead
- The lead's permission settings

### What Teammates Do NOT Inherit
- The lead's conversation history
- Per-teammate permission overrides (set at spawn time only from the lead's mode)

### Communication Mechanisms
- **Direct messaging**: any teammate can message any other by name; messages are delivered automatically
- **Idle notifications**: teammate automatically notifies the lead when it finishes
- **Shared task list**: all agents see task status and can claim available work
- To reach everyone: send one message **per recipient** (no broadcast)

---

## Spawning Teammates

### Basic Spawn
```text
Spawn three teammates to review PR #142:
- One focused on security
- One checking performance  
- One validating test coverage
```

### Spawn with Model Override
```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate.
```

Default teammate model: the lead's model. To change the default, set **Default teammate model** in `/config`, or pick **Default (leader's model)** to have teammates always follow the lead.

### Spawn with Predictable Names
Specify names in the prompt so you can reference them later:
```text
Spawn a teammate named "security-reviewer" to audit the auth module.
```

### Spawn Using a Subagent Definition
Reference any subagent type by name (project, user, plugin, or CLI-defined scope):
```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```
The subagent's `tools` allowlist and `model` are honored. Team coordination tools (`SendMessage`, task tools) are **always available** even when `tools` restricts others.

> Note: `skills` and `mcpServers` frontmatter fields in subagent definitions are **not** applied when running as a teammate. They load from project/user settings instead.

### Spawn with Plan Approval Required
```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```
Flow: teammate plans → submits approval request to lead → lead approves or rejects with feedback → on approval, teammate exits plan mode and implements.

---

## Display Modes

| Mode | Description | Requirements |
|---|---|---|
| `"in-process"` (default) | All teammates in your main terminal; agent panel below prompt | Any terminal |
| `"auto"` | Split panes if in tmux or iTerm2, else falls back to in-process | tmux or iTerm2 |
| `"tmux"` | Split panes; auto-detects tmux vs iTerm2 | tmux or iTerm2 |
| `"iterm2"` | iTerm2 native split panes | iTerm2 + `it2` CLI + Python API enabled |

Set globally in `~/.claude/settings.json`:
```json
{ "teammateMode": "auto" }
```

Or per-session:
```bash
claude --teammate-mode auto
```

### In-Process Navigation
- **Up/Down arrows**: select a teammate in the agent panel
- **Enter**: open the teammate's transcript and message it
- **Escape**: interrupt the selected teammate's current turn
- **x** on selected teammate: stop it
- **Ctrl+T**: toggle the task list
- Idle teammate rows hide after 30 seconds and reappear on the next turn (teammate stays running)

---

## Quality Gates via Hooks

| Hook | Fires When | Exit Code 2 Effect |
|---|---|---|
| `TeammateIdle` | Teammate is about to go idle | Sends feedback, keeps teammate working |
| `TaskCreated` | A task is being created | Prevents creation, sends feedback |
| `TaskCompleted` | A task is being marked complete | Prevents completion, sends feedback |

---

## Team Size & Task Sizing

### Team Size Rules of Thumb
- **Start with 3-5 teammates** for most workflows
- **5-6 tasks per teammate** keeps everyone productive without excessive context switching
- Token costs scale linearly — each teammate is a full Claude context window
- Scale up only when work genuinely benefits from simultaneous execution
- Three focused teammates often outperform five scattered ones

### Task Size Rules of Thumb
- **Too small**: coordination overhead exceeds the benefit
- **Too large**: long runs without check-ins increase wasted effort risk
- **Just right**: self-contained units with a clear deliverable (a function, a test file, a review)

---

## Best Practices

### Always Include Sufficient Context in the Spawn Prompt
Teammates don't inherit the lead's conversation history. Put task-specific details directly in the spawn prompt:
```text
Spawn a security reviewer with the prompt: "Review src/auth/ for vulnerabilities.
Focus on token handling, session management, and input validation.
The app uses JWT tokens stored in httpOnly cookies. Report issues with severity ratings."
```

### Avoid File Conflicts
Two teammates editing the same file leads to overwrites. Assign each teammate a distinct, non-overlapping set of files.

### Give Teammates Adversarial Roles for Debugging
When root cause is unclear, use competing hypotheses and have teammates actively try to disprove each other:
```text
Spawn 5 teammates to investigate different hypotheses. Have them talk to each other
to disprove each other's theories, like a scientific debate.
```

### Use Distinct Review Lenses
For code review, assign each teammate a specific lens so they don't overlap:
```text
Spawn three teammates to review PR #142:
- One on security implications
- One on performance impact
- One validating test coverage
```

### Keep the Lead From Doing Work Prematurely
```text
Wait for your teammates to complete their tasks before proceeding.
```

### Monitor and Steer
Check in on teammates' progress regularly. Redirect approaches that aren't working. Don't let teams run unattended for too long.

### Start With Research/Review Tasks
If new to agent teams, begin with tasks that have clear boundaries and don't write code — reviewing a PR, researching a library, investigating a bug. Lower coordination risk.

---

## Shutdown

To shut down a teammate gracefully:
```text
Ask the researcher teammate to shut down
```
The lead sends a shutdown request; the teammate can approve or reject with a reason.

Team config directories are cleaned up automatically on session exit. Task list directories persist (governed by `cleanupPeriodDays` setting).

---

## Limitations (as of v2.1.186)

| Limitation | Notes |
|---|---|
| No session resumption with in-process teammates | `/resume` and `/rewind` don't restore teammates; lead may message non-existent teammates — spawn new ones |
| Task status can lag | Teammates sometimes don't mark tasks complete; manually update or tell lead to nudge |
| Slow shutdown | Teammates finish their current request before exiting |
| One team per session | Can't create additional named teams or share a team across sessions |
| No nested teams | Teammates cannot spawn their own teammates; only the lead can manage the team |
| Lead is fixed | Can't promote a teammate to lead or transfer leadership |
| Permissions set at spawn | All teammates start with lead's permission mode; can't set per-teammate modes at spawn time |
| Split panes limited | Not supported in VS Code integrated terminal, Windows Terminal, or Ghostty; requires tmux or iTerm2 |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Teammates not appearing | Check agent panel (in-process mode); idle rows hide after 30s but teammate is still running — send it a message by name |
| Too many permission prompts | Pre-approve common operations in permission settings before spawning teammates |
| Teammate stopped on error | Select teammate and send it additional instructions, or spawn a replacement |
| Lead shuts down early | Tell it to keep going; or tell it to wait for teammates before proceeding |
| Orphaned tmux session | `tmux ls` then `tmux kill-session -t <session-name>` |

---

## Proven Use Case Patterns

### Parallel Code Review
```text
Spawn three teammates to review PR #142:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Competing Hypothesis Debugging
```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific debate.
Update the findings doc with whatever consensus emerges.
```

### Parallel Feature Development
```text
Spawn 4 teammates to implement these modules in parallel:
- [teammate 1]: src/auth/
- [teammate 2]: src/api/
- [teammate 3]: src/db/
- [teammate 4]: tests/
Use Sonnet for each teammate. Do not start implementing until you have a plan approved.
```

### Exploratory Research (Multi-Perspective)
```text
I'm designing a CLI tool that helps developers track TODO comments across their codebase.
Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```
