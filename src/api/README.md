# src/api

Ludium's backend service — ASP.NET Core (.NET 10) minimal API.

## Requirements

The [.NET 10 SDK](https://dotnet.microsoft.com/download). The repo's
`global.json` requires it and will give a clear error on an older SDK.

## Getting started

From the repo root:

```bash
dotnet run --project src/api
```

The local run profile listens on
[http://localhost:5080](http://localhost:5080). Confirm it's up:

```bash
curl http://localhost:5080/health/live
```

That returns `200` with the body `Healthy`. It needs no database — it only
reports that the service itself started and is serving requests.

## Structure

- `Program.cs` — the whole service: builds the host, registers health
  checks, and maps the liveness endpoint.
- `appsettings.json` — configuration checked into the repo.
- `Properties/launchSettings.json` — the local run profile, including the
  port above. That port applies to `dotnet run` only; a published build
  binds Kestrel's own defaults instead. HTTP only, so running it locally
  doesn't depend on trusting a development HTTPS certificate first.

## Configuration

Local development settings go in `appsettings.Development.json`, the
built-in ASP.NET Core convention — it loads automatically on top of
`appsettings.json` when the environment is Development, which the run
profile sets.

That file isn't in the repo yet, because nothing currently differs from
`appsettings.json`. Create it when something does.

Neither file is gitignored, so neither is a place for secrets. When
something genuinely secret needs to live locally, use user secrets:
`dotnet user-secrets init --project src/api` registers the project, and the host then loads
them automatically in Development.

## Health checks

- `GET /health/live` — liveness. `200 Healthy` means the service is
  running. It runs no checks: the predicate excludes every registered
  check, including ones added later, so it keeps answering while a
  dependency is down.

Readiness — whether the service can reach its database — arrives with the
database work later in this phase.

## Tests

From the repo root:

```bash
dotnet test
```

That runs every backend test project. It needs no arguments because
`Ludium.slnx` at the repo root lists them; adding another test project to the
solution is enough for this command to pick it up.

Tests live in [`tests/api/`](../../tests/api/), mirroring `src/api`. They need
no database and no running server: `WebApplicationFactory` starts the app
in-process and calls it over an in-memory transport, so there is no port to
bind and no connection string to configure.

`TestApiFactory` decides what configuration the app under test sees. It runs
under the `Testing` environment, clears every configuration source the host
would otherwise pick up, and then adds back `appsettings.json` alone.

That leaves tests running on exactly the settings the service ships with.
Nothing machine-specific gets in — not `appsettings.Development.json` (which
carries the database settings once the schema work lands), not user secrets,
not a stray environment variable — while the committed baseline is still
exercised, so tightening a setting there is a change tests can actually catch.
Anything else a test needs is added in that factory, deliberately.

The test runner reports usage telemetry to Microsoft unless
`TESTINGPLATFORM_TELEMETRY_OPTOUT=1` or the .NET-wide
`DOTNET_CLI_TELEMETRY_OPTOUT=1` is set. Both are environment variables — there
is no setting to check in — so set one in your shell if you want it off
locally.

Note that `dotnet test` builds the service, so it fails with a file-lock error
if `dotnet run` is holding the binary. Stop the running service first.

Tests run on [xUnit v3](https://xunit.net/), which uses Microsoft.Testing
Platform rather than VSTest. `global.json` selects that runner for
`dotnet test`; without it the .NET 10 SDK errors out instead of falling back.

### Coverage

Coverage is collected on request rather than on every run, so the command above
stays a plain pass/fail:

```bash
dotnet tool restore   # once per clone
git clean -xdf TestResults coverage
dotnet test --coverage --coverage-output-format cobertura
dotnet reportgenerator -reports:"TestResults/**/*.cobertura.xml" -targetdir:"coverage" -reporttypes:"Html;TextSummary"
```

That writes a browsable report to `coverage/index.html` and a console-friendly
summary to `coverage/Summary.txt`. Both `TestResults/` and `coverage/` are
gitignored.

Let the runner name the coverage files rather than pinning one name: every test
project writes its own, and a fixed name means they overwrite each other and
the report silently covers whichever finished last. The glob picks up all of
them, and clearing `TestResults/` first stops files from earlier runs being
counted too. `git clean` is used for that rather than a shell-specific delete,
so the same line works whichever shell you run it from. `-x` is needed because
both directories are gitignored and a plain `git clean -df` would skip them.

Keep both paths on that line. `git clean -xdf` without them deletes every
untracked and ignored file in the repo — `node_modules/`, your
`appsettings.Development.json`, any `.env.local` — and none of it is
recoverable from git.

No minimum coverage is enforced — nothing here fails a build on a low number.
Enforcing a threshold only does real work once it runs on proposed changes, so
it belongs with the Infra phase's merge gate rather than in a local command.

## Package sources

[`nuget.config`](../../nuget.config) at the repo root clears inherited package
sources and lists only nuget.org. Restore would otherwise also use whatever
feeds the machine or build agent has configured, which makes a build depend on
the machine it runs on and lets an unrelated feed answer for a package name
expected from nuget.org.

## Other commands

```bash
dotnet build src/api   # compile
```
