# @avrash/e2e

Playwright suites for [`apps/web`](../apps/web/README.md) and [`apps/admin`](../apps/admin/README.md).
They cover what unit tests cannot: layout, scroll-driven animations, iOS Safari behavior, consent,
analytics beacons and full CMS flows.

## Projects

| Project       | Device             | Covers                                                                                                                                             |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web`         | Desktop Chrome     | All web specs: navigation, works filtering, showcase, contact, CV, consent, analytics, legal pages, 404, document integrity, animation performance |
| `web-ios`     | iPhone 13 (WebKit) | Touch and iOS-specific specs: header menu, overscroll, carousels, Hero transitions, legal TOC                                                      |
| `web-webkit`  | iPhone 13 (WebKit) | Hero rendering and scroll performance, showcase gallery, works filter taps                                                                         |
| `admin-setup` | -                  | Signs in once and saves the session                                                                                                                |
| `admin`       | Desktop Chrome     | Login, logout, create and edit projects, image and GIF upload, upload size limits, CV management                                                   |

## How a run works

- **Own servers.** Each run starts its own servers on ports 3100 (web) and 3101 (admin), so it never
  attaches to a running `pnpm dev`.
- **Isolated content.** Admin writes to `e2e/.scratch/content`, which is wiped and reseeded on every
  run. Real content in `packages/content-data` is never touched. Web gets a seeded CV from the same
  scratch directory.
- **Test credentials.** A test user and session secret are generated from
  [`fixtures/testCredentials.ts`](fixtures/testCredentials.ts). No real secrets are needed.
- **Consent.** Web specs start with analytics consent already given. The analytics endpoint is a
  fake URL that specs intercept with `page.route()`.
- **Streamed pages.** [`fixtures/test.ts`](fixtures/test.ts) wraps `page.goto` and `page.reload` to
  wait until React has inserted the streamed page content, so specs never see the loading state.
  Web specs import `test` and `expect` from this fixture.
- **Production servers.** `E2E_SERVER=production` builds both apps and serves them through
  [`server/next-production-server.mjs`](server/next-production-server.mjs). This server works
  around a Next.js image optimizer issue where an aborted request blocks that image for later
  requests.

## Running

```bash
pnpm --filter @avrash/e2e exec playwright install    # once

pnpm test:e2e                                         # from the root: dev servers, all projects
pnpm --filter @avrash/e2e exec playwright test --project=web
pnpm --filter @avrash/e2e run test:ui                 # Playwright UI mode
```

| Variable                 | Effect                                                |
| ------------------------ | ----------------------------------------------------- |
| `E2E_SERVER=production`  | Test against production builds instead of dev servers |
| `E2E_APPS=web` / `admin` | Start only the servers a run needs (default: both)    |

## CI

[`e2e-ci.yml`](../.github/workflows/e2e-ci.yml) runs five parallel jobs against production builds:
`web` in two shards, `web-ios`, `web-webkit`, and `admin`. Each job uploads its HTML report as an
artifact, and failures appear as annotations on the pull request.

## Layout

```
tests/web/       # Site specs
tests/admin/     # CMS specs and auth.setup.ts
fixtures/        # Shared test fixture, consent state, CV PDF and noise PNG generators, upload files, hero geometry baselines
helpers/         # Document height and Hero scene measurement helpers
server/          # Production server used by E2E_SERVER=production
```
