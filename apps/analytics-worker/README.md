# Analytics Worker

A small Cloudflare Worker that collects the site's custom product events - `project_open`,
`project_gallery_view`, `project_external_click`, `works_filter`, `cv_download`,
`contact_started`, `contact_success`, `social_click` - plus a `page_view` for every page a visitor
reaches, into a Cloudflare D1 database, and serves aggregated reads of them back to the Admin
dashboard. Traffic is kept here as well as in Vercel Analytics because Vercel only retains a
limited window, while these rows stay until the retention cron removes them.

Every event also stores:

- `country` from Cloudflare (`request.cf.country`); the IP address itself is never stored.
- `device`, `os` and `browser`, parsed server-side from the `User-Agent` header.
- `visitor_id`, a SHA-256 of `VISITOR_SALT | UTC day | IP | User-Agent` (first 16 bytes). It
  rotates every day, needs no cookie or storage, and cannot be reversed to an IP. A visitor is
  therefore counted once per day, the same model Vercel Analytics uses.

Requests whose `User-Agent` looks like a crawler, a link preview, a headless browser or an HTTP
client are acknowledged with `204` and not stored.

`apps/web`'s `shared/analytics/analytics.ts` (`trackEvent(...)`) is the only writer. It's a no-op
until `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set, so nothing here needs to exist for the site to work.

`apps/admin`'s `entities/analytics/api/analyticsRepository.ts` is the only reader, same story -
its Analytics page shows a "not connected" state until `ANALYTICS_WORKER_URL` /
`ANALYTICS_READ_SECRET` are set there.

## Endpoints

- `POST /event` - public, no bearer auth (a beacon from any visitor's browser), but it does check
  the request's `Origin` header against `ALLOWED_ORIGIN` and rejects a mismatch with `403` - a
  CORS response header alone only constrains browsers, not curl or a script, so this is the actual
  server-side gate. Not spoof-proof (a non-browser client can set `Origin` to whatever it wants),
  but it stops a random third-party site's own visitors' browsers from posting events here.
  Validated against the event allowlist, rate-limited and deduped per session too - see
  `src/handleEvent.ts`.
- `GET /analytics/overview?days=30` - daily `project_open`/`contact_started`/`contact_success`
  counts, plus the contact form's start-to-send conversion rate.
- `GET /analytics/projects?days=30` - per-project opens/external clicks/CTR/gallery views/gallery
  view rate, sorted by opens desc.
- `GET /analytics/projects/:entityId?days=30` - one project's totals, daily timeline, top
  countries and languages.
- `GET /analytics/categories?days=30` - `works_filter` counts by category, as percentages of the
  total (top 10).
- `GET /analytics/traffic?days=30` - page views, daily visitors, views per visitor, a daily
  timeline of page views, visitors and sessions, the top 50 pages with their share of views,
  the top 10 countries, languages, referrer hosts, devices, operating systems and browsers by
  visitors, and the top 20 UTM campaign combinations.
- `GET /analytics/engagement?days=30` - `cv_download` total, `social_click` counts per
  network, and a trend of both (daily up to 30 days, weekly beyond).
- `GET /analytics/sessions?days=30` - sessions with at least one page view, pages and events
  per session, the single-page share, the median length of multi-page sessions, and two
  session funnels: project open -> gallery view / external click, and contact started -> sent.

Only `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` are kept, each capped at 100
characters, and only on the first page view after the visitor allows analytics - the rest of
the landing query string is never sent.

The referrer is reduced to its origin (`https://www.google.com`) both in the browser and again
in the worker before it is stored, so search terms, paths and query strings of the referring
page never reach the database. Migration 0004 rewrites referrers stored before this rule to
their origin as well.

The `GET /analytics/*` routes require `Authorization: Bearer <ANALYTICS_READ_SECRET>` -
they're read access to real (if anonymized) visitor behavior, not a public API.

## Status

Code and schema only - **not deployed anywhere yet**. `src/handleEvent.ts`, `src/db.ts` and
`src/schema.ts` are plain TypeScript with no Workers-only globals, so they're covered by real unit
tests (`pnpm test`) under Node. `src/index.ts` is the thin Workers `fetch` adapter around them - it
needs an actual Cloudflare account to run (`wrangler dev` / `wrangler deploy`), so it's only verified
by `tsc --noEmit` so far, not by a live request.

## Deploying (when you're ready to)

1. `wrangler login`
2. `wrangler d1 create avrash-analytics` - paste the printed `database_id` into `wrangler.toml`.
3. `wrangler d1 migrations apply avrash-analytics --remote` - runs every file in `migrations/`
   that has not been applied yet (`0002_traffic.sql` adds the visitor/device columns).
4. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the real site origin (e.g. `https://avrash.com`).
5. `wrangler secret put VISITOR_SALT` - any long random string. Without it the read secret is
   used as the salt.
6. `wrangler deploy`, then either uncomment the `[[routes]]` block in `wrangler.toml` for a custom
   domain (e.g. `analytics.avrash.com`) or use the `*.workers.dev` URL Wrangler prints.
7. Set `apps/web`'s `NEXT_PUBLIC_ANALYTICS_ENDPOINT` to that URL + `/event`.

Local dev without deploying: copy `.dev.vars.example` to `.dev.vars` (gitignored) and pick any
value for `ANALYTICS_READ_SECRET` - just make sure `apps/admin/.env`'s own
`ANALYTICS_READ_SECRET` matches it. `pnpm --filter @avrash/analytics-worker run dev` (or the root
`pnpm dev`, which now runs web/admin/this worker together) runs `wrangler dev`, which emulates D1
locally (`--local` migrations from step 3 target that emulated database, not the real one).

## Retention

A daily cron (`[triggers]` in `wrangler.toml`) deletes events older than `RETENTION_DAYS`
(730 by default).
