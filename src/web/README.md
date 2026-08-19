# src/web

Ludium's frontend app — Next.js (App Router) + TypeScript + Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `app/layout.tsx` — root layout: fonts (Sora/Inter), the persistent header
  (logo), and the dark/light theme toggle — shared chrome for every page.
- `app/globals.css` — design tokens (colors, fonts) as Tailwind v4 `@theme`
  values, pulled from the approved mockups in
  [`../../design/ludium-mockups.dc.html`](../../design/ludium-mockups.dc.html).
  Use these (`bg-bg`, `text-text-primary`, `font-sora`, etc.) rather than
  hardcoding colors, so pages stay consistent and theme-able.
- `app/components/` — shared UI components.

## Other scripts

```bash
npm run build   # production build
npm run lint    # ESLint
```
