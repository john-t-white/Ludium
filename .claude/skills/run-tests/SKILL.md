---
name: run-tests
description: Run the project's local test suites (.NET unit tests, .NET integration tests, and Next.js tests if present) and produce a pass/fail summary. Use before pushing, or whenever asked to verify tests pass.
allowed-tools: Bash(dotnet test *) Bash(npm test *) Bash(npm run *)
---

# Run local test suites

Run each available suite and record pass/fail plus any failure output:

```bash
dotnet test src/api.unit-tests
dotnet test src/api.integration-tests
```

If `src/web/package.json` defines a `test` script, also run:

```bash
npm test --prefix src/web
```

Summarize the results as a short pass/fail line per suite (e.g. "unit-tests: 42 passed", "integration-tests: 1 failed — <test name>"). Skip a suite and note it as skipped if its project/script doesn't exist rather than treating that as a failure.
