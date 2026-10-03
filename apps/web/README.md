# @avrash/web

The public portfolio site, live at [avrash.com](https://avrash.com). Next.js 16 App Router, statically
rendered per locale, with content managed in [`apps/admin`](../admin/README.md).

Setup for the whole monorepo is in the [root README](../../README.md).

---

## Features

- **Pages:** home, works catalog (`/works`), a shareable URL per project (`/works/<slug>`), contact
  (`/contact`), four legal documents (`/legal/*`) and a localized 404 page.
- **Home:** hero with a scroll-driven depth transition into stats and selected work, services,
  projects gallery, clients, tools, reviews and a call to action.
- **Works catalog:** category filter, and a showcase modal with an overview and a gallery. GIFs show
  a precomputed poster first, so the gallery opens without downloading the animation.
- **Localization:** English and Polish via `next-intl`, with locale-prefixed routes, `hreflang`
  alternates and English fallback for untranslated content.
- **Contact form:** sends email through Resend, with server-side validation, a honeypot field and a
  per-IP rate limit (5 requests / 10 minutes) from
  [`@avrash/rate-limit`](../../packages/rate-limit/README.md), shared across instances through
  Upstash Redis.
- **CV download:** one PDF per language, uploaded in admin. Visitors get the CV in their language,
  otherwise the English one, otherwise any uploaded one.
- **Privacy consent:** a banner and a preferences panel. The saved theme, the "preloader seen" flag,
  first-party analytics and Vercel Analytics / Speed Insights run only after the matching consent.
- **Theme:** light by default, with a dark mode switched through the View Transitions API. An inline
  head script applies the saved theme before first paint, so there is no flash.
- **Icons:** an SVG favicon with a 192 px PNG fallback, a multi-size `/favicon.ico` for services that
  request it directly, and a 180 px Apple touch icon, all rendered from one SVG.
- **SEO:** per-page metadata and canonical URLs, Open Graph images (a project page uses its own hero
  image), JSON-LD `Person`, a dynamic `sitemap.xml` and `robots.txt`.
- **Accessibility:** semantic landmarks, visible focus, keyboard-operable carousels and modal,
  `prefers-reduced-motion` respected by every animation.
- **Security headers:** a strict Content Security Policy built from the configured CDN and analytics
  origins, `X-Frame-Options: DENY`, `nosniff` and a strict referrer policy.

---

## Rendering and data flow

All locale pages are generated at build time (`generateStaticParams` and `setRequestLocale`). The
layout reads no cookies, so the HTML can be served from the CDN. Per-visitor state such as the theme
is applied on the client.

Content goes through [`shared/api/contentClient.ts`](src/shared/api/contentClient.ts):

1. With `CONTENT_SOURCE=remote`, it fetches `<CONTENT_CDN_URL>/content/<file>.json` from R2. The
   fetch is cached under a tag named after the resource.
2. Resources that admin can edit are validated with their Zod schema from `@avrash/content-schema`.
3. If the remote file is missing or the request fails, it falls back to the JSON bundled from
   `@avrash/content-data`.
4. Root-relative `/projects/...` image paths are rewritten to absolute CDN URLs.

When admin saves something, it calls `POST /api/revalidate` with that tag. The route checks a shared
bearer secret and invalidates only the affected resource. `CONTENT_REVALIDATE_SECONDS` (one day by
default) is only a fallback for deployments without that call.

### API routes

| Route                  | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `POST /api/contact`    | Validates the contact form and sends it via Resend                 |
| `GET /api/cv/<locale>` | Serves the CV for a language with fallback and `ETag` revalidation |
| `POST /api/revalidate` | Cache-tag invalidation called by admin (bearer secret)             |
| `GET /api/<resource>`  | Read-only JSON of a bundled content resource                       |

---

## Project structure

The code follows [Feature-Sliced Design](https://feature-sliced.design):

```
src/
├── app/                  # Routes: [locale]/ pages, api/, sitemap.ts, robots.ts
├── widgets/              # Page sections: HeroSection, WorksCatalog, ContactSection, Header, Footer, ...
├── features/             # privacy-preferences: consent banner, panel, conditional analytics
├── entities/             # One folder per content type, each with a get*(locale) fetcher
├── content/legal/        # Legal documents as Markdown strings, see its README
├── i18n/                 # next-intl routing and message loading
├── shared/
│   ├── api/              # Content client, bundled content store, contact service
│   ├── analytics/        # trackEvent() and the page view tracker
│   ├── config/           # Site config, navigation, scroll choreography
│   ├── lib/, hooks/      # SEO, locale resolution, GSAP/Motion helpers, theme
│   ├── providers/        # Theme, motion and preloader providers
│   ├── styles/           # Design tokens, typography, mixins
│   └── ui/               # Site-only UI kit; components shared with admin live in @avrash/ui
├── proxy.ts              # next-intl locale routing
└── instrumentation-client.ts
messages/                 # UI strings per locale (en.json, pl.json)
```

- Content types and schemas live in [`packages/content-schema`](../../packages/content-schema/README.md).
  Data lives in [`packages/content-data`](../../packages/content-data/README.md).
- Localized fields sit in an `i18n: { en, pl }` block in the JSON. Each `get*(locale)` fetcher returns
  an already resolved object, so components never see the raw block.
- Locales are defined once in `SITE_LOCALES` (`@avrash/content-schema/locale`) and shared with admin.

### Design system

- **Tokens:** colors, spacing, radius and shadows are CSS custom properties in
  [`shared/styles/tokens.scss`](src/shared/styles/tokens.scss), redefined per theme.
- **Typography:** Almarai for the site and Zalando Sans SemiExpanded for accent headings, loaded
  with `next/font` ([`typography.scss`](src/shared/styles/typography.scss)).
- **Motion:** Framer Motion presets and GSAP scroll reveals read durations, easings and distances
  from [`shared/constants/motion.ts`](src/shared/constants/motion.ts).

---

## Analytics

[`trackEvent()`](src/shared/analytics/analytics.ts) sends events to
[`apps/analytics-worker`](../analytics-worker/README.md) with `navigator.sendBeacon`:

- page views, project opens, gallery views and external clicks;
- works filters, CV downloads, social clicks, and contact form starts and sends.

Nothing is sent until the visitor allows analytics. Referrers are reduced to their origin, and only
four UTM parameters are kept. Without `NEXT_PUBLIC_ANALYTICS_ENDPOINT` the function does nothing.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`. Every variable is optional for local development.

| Variable                                             | When needed            | Purpose                                                                           |
| ---------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                               | Production             | Canonical URL for metadata, sitemap and robots                                    |
| `CONTENT_SOURCE`                                     | Production             | `remote` reads content from R2                                                    |
| `CONTENT_CDN_URL`                                    | With R2                | Public R2 base URL. Also allowed in `next/image` and the CSP                      |
| `CONTENT_REVALIDATE_SECONDS`                         | Optional               | Fallback cache lifetime for remote content (default `86400`)                      |
| `REVALIDATE_SECRET`                                  | With admin             | Bearer secret for `/api/revalidate`. Must match admin's value                     |
| `CONTENT_DATA_DIR`                                   | Shared filesystem only | Directory with `cv.json` and `cv/uploads`. Must match admin's `ADMIN_CONTENT_DIR` |
| `CONTENT_API_URL`                                    | Optional               | External CMS API used when a resource is not found locally or in R2               |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT`                     | With analytics         | Worker URL including `/event`                                                     |
| `RESEND_API_KEY`                                     | Contact form           | Resend API key                                                                    |
| `CONTACT_EMAIL_TO`                                   | Contact form           | Inbox that receives submissions                                                   |
| `CONTACT_EMAIL_FROM`                                 | Optional               | Sender address, defaults to Resend's sandbox sender                               |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Production             | Shared rate-limit counter (`KV_REST_API_*` from the Vercel integration also work) |
| `TRUST_PROXY`                                        | Self-hosted only       | `1` when a reverse proxy in front appends `X-Forwarded-For`                       |

---

## Scripts

| Command                                      | What it does                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`                                   | Dev server on http://localhost:3000                                                    |
| `pnpm build` / `pnpm start`                  | Production build and server                                                            |
| `pnpm build:check`                           | Standalone build, used by the pre-push hook                                            |
| `pnpm test`                                  | Vitest unit tests (`src/**/*.test.ts`)                                                 |
| `pnpm lint` / `pnpm type-check`              | ESLint and TypeScript                                                                  |
| `node scripts/generate-noise-tile.mjs`       | Regenerates the hero noise texture                                                     |
| `node scripts/generate-tool-peek-blends.mjs` | Regenerates the blurred tool card previews                                             |
| `node scripts/generate-icons.mjs`            | Renders `favicon.ico`, the 192 px icon and the 180 px Apple touch icon from `icon.svg` |

Browser behavior (layout, animations, iOS scrolling, consent, analytics) is covered by the
Playwright suites in [`e2e`](../../e2e/README.md).

---

## Deployment

Deployed on Vercel with `apps/web` as the root directory. Production (`avrash.com`) and the dev
deployment (`dev.avrash.com`) each read content from their own R2 bucket through `CONTENT_CDN_URL`.

### Docker

The same app also ships as a self-hosted image: a multi-stage
[`Dockerfile`](Dockerfile) producing a Next.js standalone server on `node:22-alpine`. It runs as a
non-root user and has a health check. Build from the repository root, because the image needs the
workspace packages:

```bash
docker compose up --build                       # http://localhost:3000

docker build -f apps/web/Dockerfile -t avrash-web \
  --build-arg NEXT_PUBLIC_SITE_URL=https://avrash.com \
  --build-arg CONTENT_SOURCE=remote \
  --build-arg CONTENT_CDN_URL=https://cdn.example.com .
docker run -p 3000:3000 --env-file apps/web/.env.docker avrash-web
```

- **Build arguments:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ANALYTICS_ENDPOINT`, `CONTENT_SOURCE`
  and `CONTENT_CDN_URL`. Pages, metadata and the CSP are generated at build time, so these values
  must be known then.
- **Behind a reverse proxy:** set `TRUST_PROXY=1` so the contact form's rate limit uses the real
  client IP. Without it, all requests share one counter.
- **Runtime secrets:** `RESEND_API_KEY`, `CONTACT_EMAIL_TO`, `REVALIDATE_SECRET` and the others go
  in `apps/web/.env.docker`, which is gitignored and never copied into the image.
- **Project galleries:** they are not in git or in the image, the same as on Vercel, so set
  `CONTENT_CDN_URL` to serve them from R2.

[`docker-ci.yml`](../../.github/workflows/docker-ci.yml) builds the image on every change, starts it,
waits for the health check, and smoke-tests the main routes.
