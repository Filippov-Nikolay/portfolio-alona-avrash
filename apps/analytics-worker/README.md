# @avrash/analytics-worker

A Cloudflare Worker that collects the site's product events into Cloudflare D1 and serves aggregated
reports to the admin dashboard. It runs in two environments:

- `analytics.avrash.com` for production;
- `analytics-dev.avrash.com` for the dev site.

Vercel Analytics keeps only a limited history and has no project-level events. This worker keeps
both for as long as the retention period allows.

Setup for the whole monorepo is in the [root README](../../README.md).

---

## What is collected

[`apps/web`](../web/README.md)'s `trackEvent()` is the only writer. It sends events only after the
visitor allows analytics. Events: `page_view`, `project_open`, `project_gallery_view`,
`project_external_click`, `works_filter`, `cv_download`, `contact_started`, `contact_success`,
`social_click`.

Each event also stores:

- **`country`** from Cloudflare (`request.cf.country`). The IP address itself is never stored.
- **`device`, `os`, `browser`**, parsed on the server from the `User-Agent` header.
- **`visitor_id`**: a SHA-256 of `VISITOR_SALT | UTC day | IP | User-Agent`, truncated to 16 bytes.
  It rotates daily, needs no cookie, and cannot be reversed to an IP, so a visitor is counted once
  per day.
- **Referrer** reduced to its origin, in the browser and again here. Search terms and paths never
  reach the database.
- **UTM parameters**: only `utm_source`, `utm_medium`, `utm_campaign` and `utm_content`, capped at
  100 characters, and only on the first page view after consent.

Requests from crawlers, link previews, headless browsers and HTTP clients get a `204` and are not
stored.

---

## Endpoints

| Route                                       | Auth   | Returns                                                                                                     |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `POST /event`                               | Origin | Stores one event: validated, rate-limited and deduplicated per session                                      |
| `GET /analytics/overview?days=30`           | Bearer | Daily project opens, contact starts and sends, and the contact conversion rate                              |
| `GET /analytics/projects?days=30`           | Bearer | Per project: opens, external clicks, CTR, gallery views and gallery view rate                               |
| `GET /analytics/projects/:entityId?days=30` | Bearer | One project's totals, daily timeline, and top countries and languages                                       |
| `GET /analytics/categories?days=30`         | Bearer | Top 10 works filters as shares of the total                                                                 |
| `GET /analytics/traffic?days=30`            | Bearer | Views, visitors, sessions, top pages, countries, languages, referrers, devices, OS, browsers, UTM campaigns |
| `GET /analytics/engagement?days=30`         | Bearer | CV downloads by language, social clicks by network, and their trend                                         |
| `GET /analytics/sessions?days=30`           | Bearer | Pages and events per session, single-page share, median length, and conversion funnels                      |

- **`POST /event`** is a public beacon, so it has no bearer token. The worker rejects a request
  with `403` when its `Origin` header does not match `ALLOWED_ORIGIN`. That stops other sites'
  visitors from posting events. It does not stop a script that fakes the header.
- **`GET /analytics/*`** requires `Authorization: Bearer <ANALYTICS_READ_SECRET>`, which only admin
  has.

---

## Project structure

```
src/
├── index.ts             # Workers fetch and scheduled handlers, routing, CORS
├── handleEvent.ts       # Event pipeline: validation, bot filtering, rate limit, dedupe
├── analyticsQueries.ts  # SQL for every report
├── db.ts                # D1 access
├── schema.ts            # Zod event schema and event allowlist
├── security.ts          # Origin check and bearer check
└── userAgent.ts         # Device, OS, browser, bot detection and the visitor hash
migrations/              # D1 schema, applied in order (0001 - 0004)
wrangler.toml            # dev (default) and production environments
```

All modules except `index.ts` are plain TypeScript without Workers globals, so Vitest tests them
under Node.

---

## Configuration

| Name                    | Where                 | Purpose                                                         |
| ----------------------- | --------------------- | --------------------------------------------------------------- |
| `ALLOWED_ORIGIN`        | `wrangler.toml` vars  | Site origin allowed to post events                              |
| `RETENTION_DAYS`        | `wrangler.toml` vars  | Events older than this are deleted (730)                        |
| `DB`                    | `wrangler.toml` D1    | `avrash-analytics-dev` or `avrash-analytics-prod`               |
| `ANALYTICS_READ_SECRET` | `wrangler secret put` | Bearer token for reports. Must match admin's value              |
| `VISITOR_SALT`          | `wrangler secret put` | Salt for the daily visitor hash (falls back to the read secret) |

---

## Local development

```bash
cp .dev.vars.example .dev.vars        # any ANALYTICS_READ_SECRET; use the same value in apps/admin/.env
pnpm exec wrangler d1 migrations apply avrash-analytics-dev --local
pnpm dev                              # wrangler dev on http://localhost:8787
```

`wrangler dev` emulates D1 locally. Point web's `NEXT_PUBLIC_ANALYTICS_ENDPOINT` at
`http://localhost:8787/event` and admin's `ANALYTICS_WORKER_URL` at `http://localhost:8787`.

| Command           | What it does               |
| ----------------- | -------------------------- |
| `pnpm dev`        | Local worker with D1       |
| `pnpm test`       | Vitest unit tests          |
| `pnpm type-check` | TypeScript                 |
| `pnpm deploy`     | Deploy the dev environment |

---

## Deployment

```bash
# dev
pnpm exec wrangler d1 migrations apply avrash-analytics-dev --remote
pnpm exec wrangler deploy

# production
pnpm exec wrangler d1 migrations apply avrash-analytics-prod --remote --env production
pnpm exec wrangler deploy --env production
```

Secrets are set once per environment with `wrangler secret put <NAME>`, adding `--env production`
for production. Custom domains are declared in `wrangler.toml`.

## Retention

A daily cron (`17 3 * * *`) deletes events older than `RETENTION_DAYS`.
