# src/web/

Next.js 15 (TypeScript) frontend for Ludium. Targets mobile and desktop web.

## Running Locally

```bash
npm run dev
```

App runs at `http://localhost:3000`. The API must also be running for data fetching to work — see `src/api/CLAUDE.md`.

## Key Commands

```bash
npm run dev          # start development server
npm run build        # production build
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # tsc --noEmit
```

## Project Structure

```
src/web/
├── app/                  # Next.js App Router — pages and layouts
│   ├── (marketing)/      # route group for public/unauthenticated pages
│   ├── (app)/            # route group for authenticated app pages
│   └── api/              # Next.js API routes (minimal — prefer the .NET API)
├── components/
│   ├── ui/               # generic, reusable UI primitives (buttons, inputs, modals)
│   └── features/         # feature-specific components, colocated with their page
├── lib/                  # shared utilities, API client, auth helpers
├── hooks/                # custom React hooks
└── types/                # shared TypeScript types and API contract types
```

## Conventions

- TypeScript always — no plain `.js` files
- Tabs for indentation; ESLint + Prettier enforced — run `npm run lint` before committing
- Server Components by default; add `"use client"` only when interactivity or browser APIs require it
- Data fetching happens in Server Components or Route Handlers — not in `useEffect`
- Keep components small and focused; colocate feature components with the page that uses them under `features/`
- No inline styles — use Tailwind utility classes
- Form validation mirrors the API's FluentValidation rules — keep them in sync

## API Integration

- All requests to the .NET API go through the client in `lib/api/` — no direct `fetch` calls scattered through components
- API base URL comes from the `NEXT_PUBLIC_API_URL` environment variable
- Never expose internal API URLs or secrets to the client — only `NEXT_PUBLIC_` prefixed variables reach the browser

## Environment Variables

- `NEXT_PUBLIC_API_URL` — base URL of the .NET API
- Secrets and non-public config go in `.env.local` (gitignored) — never in `.env` or `.env.development`
- In PR and production environments, variables are injected by the GitHub Actions deployment pipeline

## Navigation

- The browser back button must work correctly on all pages — never use patterns that break history (e.g. `router.replace` when `router.push` is correct, or mutations that change page state without updating the URL)
- Filters, search terms, and pagination state belong in the URL as query parameters — not in component state
- Use shallow routing for state changes that should be bookmarkable and back-navigable without a full page reload

## Testing

- E2E tests are written and owned by QA using Playwright — tests live in `src/web/e2e/`
- Component tests use React Testing Library for complex interactive client-side components only
- Run `npm run test:e2e` locally before pushing to catch regressions

## Auth

- Authentication uses third-party OAuth providers (Google, Facebook) via Auth.js (NextAuth v5)
- Auth.js handles the OAuth flow and session — configure providers in `lib/auth.ts`
- After OAuth, the session token is exchanged with the .NET API (`POST /auth/login`) for an application JWT
- Never store tokens in `localStorage` — Auth.js manages sessions via `httpOnly` cookies
- OAuth provider client IDs and secrets go in `.env.local` locally; injected by the pipeline in PR and production environments
