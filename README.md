# 30-Day Map Challenge

A responsive atlas of the November 2026 mapmaking prompts, built with Vue 3, TypeScript, Vite, Tailwind CSS and Mapbox GL JS. Each prompt has a shareable page; the calendar and map preview remain useful without a Mapbox token.

## Requirements

- Node.js 22.22+, 24.15+ or 26+ (the project is developed with Node.js 26)
- npm 11+

## Install and run

```sh
npm ci
npm run dev
```

Vite prints the local development URL. Prompt pages use hash URLs such as `/#/day/01`, so deep links work on static hosts without server-side route rewrites.

## Mapbox token (optional)

Copy `.env.example` to `.env.local` and set `VITE_MAPBOX_ACCESS_TOKEN` to a public Mapbox token (`pk…`). The token is compiled into the client bundle; never use a secret (`sk…`) token. Restrict the public token to the site origins in your Mapbox account. Without a token, the app shows an illustrated map preview instead.

## Checks and tests

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
```

Unit and component tests run with Vitest, jsdom and Vue Test Utils. Playwright runs end-to-end tests in Chromium, including axe-core accessibility checks. Install its browser once if needed:

```sh
npx playwright install chromium
```

## Production build

```sh
npm run build
npm run preview
```

The build runs strict Vue/TypeScript checks and writes the static site to `dist/`.

## Deploy to GitHub Pages

This app uses Vue Router's hash history for static-host compatibility. The included workflow builds the repository at `/map-challenge-2026/` and deploys the `dist/` artifact to GitHub Pages. In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. Push to `main` to publish; the workflow can also be run manually.

To build manually for that repository path:

```sh
GITHUB_PAGES=true npm run build
```

For a root-domain host, use the default `npm run build` instead.

## Project structure

```text
src/
  challenges/day-01 … day-30/  Per-prompt implementation folders
  components/                  Shared map and interface components
  data/                        Typed prompt calendar
  router/                      Home, 30 challenge routes and not-found route
  views/                       Home and reusable daily prompt pages
e2e/                           Playwright and axe-core browser tests
```

The 30 challenge directories are intentionally starting points for challenge-specific map logic. Shared presentation and routing live outside them, so individual experiences can be added without changing the calendar infrastructure.
