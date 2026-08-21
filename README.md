# Ludium

Board games, matched by how they actually played.

Ludium is a board-game shelf and matching app — not a review site. Play
logs capture how a game felt at the table, and that signal drives matches:
to similar games, and to other people who felt the same way about them.
There's no in-app buying or selling, just connecting. Importing a
collection from BoardGameGeek runs in the background from your Shelf, not
during onboarding.

## Status

Early scaffolding — see this repo's Milestones and Issues on GitHub for
current phase and progress.

## Pointers

- **Design reference:** [design/](design/) — open
  [design/ludium-mockups.dc.html](design/ludium-mockups.dc.html) in a
  browser to view the approved mockups.
- **Frontend app:** [src/web/](src/web/) — Next.js + TypeScript + Tailwind,
  see [src/web/README.md](src/web/README.md) to run it locally.
- **Backend service:** [src/api/](src/api/) — ASP.NET Core (.NET 10), see
  [src/api/README.md](src/api/README.md) to run it locally. Its tests live in
  [tests/api/](tests/api/) and run with `dotnet test` from the repo root.
- **Working conventions:** see [CONVENTIONS.md](CONVENTIONS.md) for what's
  being built, in what order, and how work is planned and reviewed.
- **Review agents:** [.claude/agents/](.claude/agents/) — the four agents that
  review every pull request, one definition file each.
