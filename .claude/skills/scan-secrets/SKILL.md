---
name: scan-secrets
description: Scan the current branch's diff against main for secret patterns (passwords, API keys, tokens, private keys) and inspect any high-risk file types (.env, *.pem, appsettings*.json, etc). Use before pushing a branch, or whenever asked to check for leaked secrets.
allowed-tools: Bash(git diff *) Bash(grep *)
---

# Scan for secrets

This checks ONLY for secrets that would reach git history. It is not a general vulnerability/OWASP review.

## Step 1 — Scan the diff for secret patterns

Run using the Bash tool (NOT PowerShell — grep requires Git Bash) and inspect every match in context:

```bash
git diff main..HEAD | grep -inE \
  "password\s*=|passwd\s*=|secret\s*=|api_key\s*=|apikey\s*=|access_key\s*=|auth_token\s*=|bearer\s+[a-z0-9]{8,}|token\s*=|private_key\s*=|-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}"
```

Any match that is a real credential (not a placeholder like "your-secret-here", an env var reference like `$SECRET`, or a test fixture) is an automatic BLOCKING finding.

## Step 2 — Inspect high-risk file types added or modified in the diff

Run `git diff main..HEAD --name-only` and read the full content of any file matching:

```
.env, .env.*, *.pem, *.key, *.p12, *.pfx, *.jks,
appsettings*.json, secrets.json, *credentials*, *secret*
```

For each: confirm all sensitive fields are env var references or placeholders, not real values.

Any real secret found in Step 1 or 2 is BLOCKING and must be removed before push.
