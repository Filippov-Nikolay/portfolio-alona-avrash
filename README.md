# Alona Avrash - Portfolio Platform

Portfolio site of brand and visual designer Alona Avrash, together with the CMS that edits it and a
privacy-friendly analytics service. Live at [avrash.com](https://avrash.com).

A `pnpm` monorepo with three deployable apps and three shared packages:

| Workspace                                                      | What it is                                                                                                         | Runs on            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| [`apps/web`](apps/web/README.md)                               | Public site: home, works catalog with project showcases, contact form, CV download, legal pages. `en` / `pl`.      | Vercel             |
| [`apps/admin`](apps/admin/README.md)                           | Password-protected CMS: projects, image galleries, categories, tool badges, per-language CV, analytics dashboards. | Vercel             |
| [`apps/analytics-worker`](apps/analytics-worker/README.md)     | Cookie-free event collector and reporting API.                                                                     | Cloudflare Workers |
| [`packages/content-schema`](packages/content-schema/README.md) | Zod schemas and types for every content file - the contract between web and admin.                                 | -                  |
| [`packages/content-data`](packages/content-data/README.md)     | Bundled content JSON, the local source and the build-time fallback.                                                | -                  |
| [`packages/rate-limit`](packages/rate-limit/README.md)         | Rate limiting for login and the contact form: Upstash Redis with an in-memory fallback, spoof-safe client IP.      | -                  |
| [`packages/ui`](packages/ui/README.md)                         | React components rendered by both apps (works card, showcase modal), so the CMS preview matches the site.          | -                  |
| [`e2e`](e2e/README.md)                                         | Playwright suites for web (desktop Chrome, iPhone WebKit) and admin.                                               | CI                 |

---

## How it fits together

```
                     writes JSON + images                 reads JSON + images
   apps/admin  ───────────────────────────►  Cloudflare R2  ◄──────────────────────  apps/web
       │                                       (CDN)                                    │
       │  POST /api/revalidate (tag) ─────────────────────────────────────────────────►│
       │                                                                                │
       │  GET /analytics/* (bearer)                          POST /event (beacon)       │
       └──────────────────────────►  apps/analytics-worker  ◄──────────────────────────┘
                                         Cloudflare D1
```

- **Content.** The apps never import each other. Admin writes content JSON and uploaded images to
  Cloudflare R2. Web reads the same files from the CDN, validates them with the same
  `content-schema`, and falls back to the snapshot bundled from `content-data` when R2 is
  unavailable. After each save, admin calls web's `/api/revalidate` with a cache tag, so changes
  appear within seconds while pages stay statically rendered.
- **Local mode.** Without any env vars, admin writes straight into `packages/content-data` and
  `apps/web/public`, and the web dev server picks the changes up. Nothing external is needed to work
  on either app.
- **Analytics.** Web sends events only after the visitor allows analytics. The worker stores them in
  D1 without IP addresses or cookies (a daily rotating visitor hash), and admin reads aggregated
  reports from it.

---

## Tech stack

- **Frontend:** Next.js 16 (App Router, static rendering, Server Actions), React 19, TypeScript
  (strict), SCSS Modules, Framer Motion, GSAP, Embla Carousel, next-intl.
- **Backend:** Next.js route handlers and Server Actions, Zod, `jose` sessions with bcrypt
  passwords, `sharp`, Resend for email, AWS S3 SDK for R2.
- **Edge:** Cloudflare Workers, D1 (SQLite), R2, Upstash Redis.
- **Quality:** Vitest, Playwright, ESLint, Prettier, Husky, lint-staged, GitHub Actions.

---

## Getting started

Requires Node.js 22+ (`.nvmrc`) and pnpm 10 (`corepack enable` installs the version pinned in
`package.json`).

```bash
pnpm install
cp apps/admin/.env.example apps/admin/.env   # set ADMIN_USERS and SESSION_SECRET to sign in
pnpm dev
```

`pnpm dev` starts all three apps:

| App              | URL                   |
| ---------------- | --------------------- |
| web              | http://localhost:3000 |
| admin            | http://localhost:3001 |
| analytics-worker | http://localhost:8787 |

The site works with no env file at all. Email sending, remote content and analytics are optional and
described in each app's README. To run a single app, use `pnpm dev:web`, `pnpm dev:admin` or
`pnpm dev:analytics`.

---

## Scripts

Run from the repository root:

| Command                             | What it does                                   |
| ----------------------------------- | ---------------------------------------------- |
| `pnpm dev`                          | Start web, admin and the worker in parallel    |
| `pnpm build`                        | Build every workspace that has a build step    |
| `pnpm lint` / `pnpm lint:fix`       | ESLint across the workspace                    |
| `pnpm type-check`                   | `tsc --noEmit` in every workspace              |
| `pnpm test`                         | Vitest unit tests (web, admin, worker, schema) |
| `pnpm test:e2e`                     | Playwright suites (see [`e2e`](e2e/README.md)) |
| `pnpm format` / `pnpm format:check` | Prettier for the whole repository              |

Target one workspace with `pnpm --filter @avrash/<name> run <script>`.

---

## Quality gates

- **Pre-commit:** lint-staged runs ESLint and Prettier on staged files, then a workspace type check.
- **Pre-push:** a standalone production build of web.
- **CI** (GitHub Actions, on pushes and pull requests to `main`, filtered by changed paths):
    - [`web-ci.yml`](.github/workflows/web-ci.yml) and [`admin-ci.yml`](.github/workflows/admin-ci.yml):
      lint, type check, schema tests, unit tests, production build.
    - [`analytics-ci.yml`](.github/workflows/analytics-ci.yml): type check and unit tests.
    - [`format-ci.yml`](.github/workflows/format-ci.yml): Prettier check of the whole repository on
      every push and pull request.
    - [`docker-ci.yml`](.github/workflows/docker-ci.yml): builds the web image, starts it and
      smoke-tests the main routes.
    - [`e2e-ci.yml`](.github/workflows/e2e-ci.yml): Playwright against production builds, split into
      five parallel jobs (web in two shards, two iPhone WebKit projects, admin).

---

## Deployment

| App               | Target                    | Notes                                                                                  |
| ----------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| web               | Vercel, root `apps/web`   | Production at `avrash.com`, dev deployment at `dev.avrash.com`. Reads content from R2. |
| admin             | Vercel, root `apps/admin` | Separate project with the `r2` storage driver.                                         |
| analytics-worker  | Cloudflare Workers        | `wrangler deploy` (dev) and `wrangler deploy --env production`.                        |
| web (self-hosted) | Docker                    | Standalone image, see [web's Docker section](apps/web/README.md#docker).               |

Each app's README lists the environment variables it needs and the shared secrets that must match
between apps.

---

## License

[MIT](LICENSE).
