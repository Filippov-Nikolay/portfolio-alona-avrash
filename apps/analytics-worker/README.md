# Analytics Worker

A small Cloudflare Worker that collects the site's custom product events - `project_open`,
`project_external_click`, `cv_download`, `contact_success`, `social_click` - into a Cloudflare D1
database, and serves aggregated reads of them back to the Admin dashboard. General traffic
(visitors, pageviews, countries, referrers) is intentionally **not** duplicated here - that already
lives in Vercel Analytics.

`apps/web`'s `shared/analytics/analytics.ts` (`trackEvent(...)`) is the only writer. It's a no-op
until `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set, so nothing here needs to exist for the site to work.

`apps/admin`'s `entities/analytics/api/analyticsRepository.ts` is the only reader, same story -
its Analytics page shows a "not connected" state until `ANALYTICS_WORKER_URL` /
`ANALYTICS_READ_SECRET` are set there.

## Endpoints

- `POST /event` - public, no auth (a beacon from any visitor's browser). Validated against the
  event allowlist, rate-limited and deduped per session - see `src/handleEvent.ts`.
- `GET /analytics/overview?days=30` - daily `project_open`/`contact_success` counts.
- `GET /analytics/projects?days=30` - per-project opens/external clicks/CTR, sorted by opens desc.
- `GET /analytics/projects/:entityId?days=30` - one project's totals, daily timeline, top
  countries and languages.

The three `GET /analytics/*` routes require `Authorization: Bearer <ANALYTICS_READ_SECRET>` -
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
3. `wrangler d1 migrations apply avrash-analytics --remote` - runs `migrations/0001_init.sql`.
4. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the real site origin (e.g. `https://avrash.com`).
5. `wrangler deploy`, then either uncomment the `[[routes]]` block in `wrangler.toml` for a custom
   domain (e.g. `analytics.avrash.com`) or use the `*.workers.dev` URL Wrangler prints.
6. Set `apps/web`'s `NEXT_PUBLIC_ANALYTICS_ENDPOINT` to that URL + `/event`.

Local dev without deploying: `pnpm --filter @avrash/analytics-worker run dev` runs `wrangler dev`,
which emulates D1 locally (`--local` migrations from step 3 target that emulated database).
