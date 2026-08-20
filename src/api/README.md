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
- `appsettings.json` — configuration checked into the repo. Nothing secret
  belongs here.
- `Properties/launchSettings.json` — the local run profile, including the
  port above. That port applies to `dotnet run` only; a published build
  binds Kestrel's own defaults instead. HTTP only, so running it locally
  doesn't depend on trusting a development HTTPS certificate first.

## Health checks

- `GET /health/live` — liveness. `200 Healthy` means the service is
  running. It deliberately registers no checks, so it keeps answering
  while a dependency is down.

Readiness — whether the service can reach its database — arrives with the
database work later in this phase.

## Other commands

```bash
dotnet build src/api   # compile
```
