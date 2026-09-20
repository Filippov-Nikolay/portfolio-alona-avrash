# Landing Page Starter

> A reusable, production-ready frontend foundation for building modern landing pages — clone it,
> restyle it, swap the content, and ship.

This is not a finished product for one specific use case. It's a **design system + composable
sections + infrastructure** (theme, i18n, SEO, animation) that you build your next landing page on top
of — whether that's a SaaS, an AI product, a startup, an agency site, a developer portfolio, or a
product presentation.

## Suitable for

Nothing in the architecture assumes a specific business domain:

- **SaaS / AI product landing pages** — Services = feature highlights, Reviews = testimonials
- **Agencies & studios** — Projects = client work, Reviews = testimonials
- **Developer / designer portfolios** — Projects = your case studies, each with its own showcase modal
- **Startups & product presentations** — Services = product highlights, CTA = waitlist/signup
- **Any other single-page marketing site** that needs a hero, a services/features grid, a project
  showcase, and a contact call-to-action

See [Example customization](#example-customization) for concrete per-use-case file changes.

---

## Features

- **A real design token system** — colors, typography, spacing, radius and shadows are CSS custom
  properties in one place, not hardcoded per component (see [Design System](#design-system))
- **A tokenized animation system** — Framer Motion and GSAP scroll animations pull duration/easing/
  distance from shared constants, so you can make the whole site feel more subtle or more dynamic by
  editing one file (see [Animations](#animations))
- **Dark / light theme** — persisted in a cookie, respects the OS `prefers-color-scheme`, no
  flash-of-wrong-theme on load
- **Localization (i18n)** — 2 languages (`en`, `pl`) via `next-intl`
- **Composable sections** — Hero, Services, Projects, Clients, Tools, Reviews, Contact/CTA, Footer —
  each independent, removable, and reusing the same UI primitives
- **SEO-ready** — per-locale metadata, OpenGraph/Twitter cards, `hreflang` alternates, structured data
  (JSON-LD), dynamic `sitemap.xml` and `robots.txt`
- **TypeScript strict mode** end to end, with domain-neutral content shapes
- **Docker-ready** — multi-stage `Dockerfile` + `docker-compose.yml`, `output: standalone`
- **CI** — GitHub Actions pipeline (`install → lint → type-check → build`)
- **Accessible defaults** — semantic landmarks, focus-visible rings, `prefers-reduced-motion` respected
  throughout, keyboard-operable carousels and modal

---

## Tech Stack

**Frontend:** Next.js 16 (App Router, SSR, Server Components) · React 19 · TypeScript · SCSS Modules ·
Framer Motion (`domMax`) · GSAP · Embla Carousel · clsx

**i18n:** next-intl (routing, middleware, message catalogs)

**Tooling:** ESLint · Prettier · Husky · lint-staged · EditorConfig · path aliases (`@/`) · TypeScript
strict mode · `@svgr/webpack` (SVG as React components)

**Infrastructure:** Docker · Docker Compose · GitHub Actions CI

---

## Getting Started

This app is one workspace member of a `pnpm` monorepo — see the [root README](../../README.md) for
`pnpm install`, running `dev`/`build`/`lint` across the workspace, Docker and CI. From here on down,
everything is specific to this app.

```bash
cp .env.example .env.local
```

---

## Architecture

Layers follow [Feature-Sliced Design](https://feature-sliced.design): `app` → `widgets` → `entities` →
`shared` (`features` is reserved for when the project grows real user-facing features — see below).

```
src/
├── app/
│   └── [locale]/          # Pages, layout, loading/error states (locale-prefixed routes)
├── i18n/                  # next-intl routing, middleware, request handling
├── widgets/                # Self-contained UI blocks, composable, independent, no cross-imports
│   ├── Header/, Footer/, Preloader/  # Global chrome, rendered once in layout.tsx
│   ├── HeroSection/, ServicesSection/, ProjectsSection/, ClientsSection/, ToolsSection/
│   ├── ReviewSection/, CtaSection/, SelectedWorkSection/, StatsSection/
│   ├── WorksCatalog/                # Full project catalog + showcase modal, /works
│   └── ContactSection/              # Contact page content
├── entities/               # Content-shaped data: model + JSON + a get*() fetcher per entity
│   └── hero/, project/, service/, review/, cta/, footer/, social/, client/, tool/, stat/, ...
└── shared/
    ├── config/               # site.config.ts, navigation.config.ts, env.ts — BRANDING
    ├── types/                   # View-model types local to this app (ShowcaseItem, NavItem, ...) -
    │                             # content-shape types live in packages/content-schema instead
    ├── ui/                       # Reusable UI kit — see "Reusable UI" below
    ├── constants/                  # colors.ts, motion.ts, breakpoints.ts, layers.ts — TOKENS (JS side)
    ├── styles/                      # tokens.scss, typography.scss, mixins.scss — TOKENS (CSS side)
    ├── lib/, hooks/, providers/       # Infrastructure — rarely needs edits
```

There is no separate "sections" layer — a landing-page block like `HeroSection` or `ServicesSection` is,
by FSD's own definition, a widget: a self-contained composition with no reuse requirement beyond being
assembled into a page. `src/features/` is kept as an empty placeholder for when the project grows a
real feature slice — safe to ignore or delete.

This separation is deliberate: **infrastructure**, **design system**, **reusable UI**, **widgets**,
**content** and **project configuration** each live in their own place, so changing one rarely touches
the others. Branding lives in `shared/config`, content lives in `src/entities/*/model` (JSON + a
`get*()` fetcher per entity — see [Content](#content); the type each JSON is shaped like lives in the
workspace-level `packages/content-schema`), colors/spacing/type live in `shared/styles` +
`shared/constants`, and layout/animation primitives live in `shared/ui` + `shared/lib`.

### Page composition

The homepage is assembled explicitly in [`src/app/[locale]/page.tsx`](<src/app/[locale]/page.tsx>) —
there's no page-builder, CMS or JSON-driven rendering engine, just JSX:

```tsx
<HeroSection ... />
<ServicesSection services={services} />
<ProjectsSection ... />
<ClientsSection ... />
<ToolsSection ... />
<ReviewSection reviews={reviews} labels={reviewsLabels} />
<CtaSection content={cta} />
```

`/works` ([`WorksCatalog`](src/widgets/WorksCatalog)) and `/contact`
([`ContactSection`](src/widgets/ContactSection)) are their own routes, assembled the same way in their
own `page.tsx`. `Header` and `Footer` are rendered once in
[`layout.tsx`](<src/app/[locale]/layout.tsx>), outside the per-page composition. Every page-composition
widget only depends on `shared/`, never on another widget — that means:

- **Remove a section** — delete its import and JSX line from `page.tsx` (and its folder under
  `src/widgets/`, if you like). Nothing else breaks.
- **Reorder sections** — reorder the JSX lines.
- **Add a section** — copy the shape of an existing widget (component + `.module.scss` + optional
  animation hook) and add it to `page.tsx`. See [Creating a section](#creating-a-section).

---

## Design System

### Colors

**[`src/shared/styles/tokens.scss`](src/shared/styles/tokens.scss)** — every color is a CSS custom
property under `:root` (theme-agnostic) or `[data-theme="dark"]` / `[data-theme="light"]`
(theme-specific):

```scss
--color-bg, --color-surface, --color-surface-light      // backgrounds
--color-text-primary, --color-text-secondary             // text
--color-border, --color-card                              // borders / glass surfaces
--color-accent                                              // brand accent (1 value re-skins the whole site)
--color-primary, --color-secondary                            // semantic aliases for the accent above
--color-success, --color-warning, --color-error                 // status colors
```

Named by role (`--color-accent`, `--color-primary`), not by hue — so the name stays accurate no matter
what color it holds. Current palette: white `#ffffff` / black `#000000` for `--color-bg` and
`--color-text-primary` (swapped per theme), lime `#eafd27` for `--color-accent`.

To re-skin the whole site, change `--color-accent` and the per-theme `--color-bg` / `--color-text-primary`
blocks in this one file — components reference the variables, never raw hex values.
**[`src/shared/constants/colors.ts`](src/shared/constants/colors.ts)** is a separate, intentionally
multi-color palette (orange/blue/purple) used only to tell project cards/modals in
[`ShowcaseModal`](src/shared/ui/ShowcaseModal) apart — it does not follow the single site accent.

### Typography

**[`src/shared/styles/typography.scss`](src/shared/styles/typography.scss)** — `--font-display`,
`--font-body` and `--font-mono` are the only places a font family is referenced; swap the `next/font`
import in [`layout.tsx`](<src/app/[locale]/layout.tsx>) and these three variables to change the
site-wide font. Current site-wide font is **Almarai** (weights 300/light for body copy, 700/bold for
headings — see the global `h1`–`h6` rule and `body` rule).

A fourth variable, `--font-title-accent` (currently **Zalando Sans SemiExpanded**, bold), is loaded the
same way in `layout.tsx` but is deliberately used in only two places — the Hero headline
(`HeroSection.module.scss` `.displayText`) and the Footer brand name (`Footer.module.scss` `.name`) —
never site-wide. The file also defines a reference type scale (`--text-xs` through `--text-display`) for
anything new you build — existing sections keep their own fine-tuned fluid `clamp()` sizes.

### Spacing, radius & shadows

**[`src/shared/styles/tokens.scss`](src/shared/styles/tokens.scss)** — `--space-2xs` … `--space-3xl`
(spacing scale), `--radius-v-sm` … `--radius-xxl` (corner radius scale), `--shadow-sm/md/lg`
(elevation). **[`src/shared/styles/mixins.scss`](src/shared/styles/mixins.scss)** holds the responsive
breakpoint mixins (`respond-to`/`respond-from`), a fluid-type helper, glass/glow effects, focus-ring and
accessibility mixins (`sr-only`, `reduced-motion`, `can-hover`) — the reusable SCSS toolkit every
section is built with.

### Reusable UI

**[`src/shared/ui/`](src/shared/ui)** — `Button`, `Container`, `Section`, `SectionHeader`, `Tag`,
`TagList`, `ThemeToggle`, `LangSwitcher`, `GridOverlay`, `NoiseLayer`, `Skeleton`, `GlowCard`,
`ShowcaseModal`. These are the building blocks a new section is expected to reuse — e.g. a
`PricingSection` would compose `Section` + `Container` + `SectionHeader` + `Card`-style markup + `Tag` +
`Button`, the same way `ServicesSection` does today.

---

## Themes (Dark / Light / System)

- **Toggle UI:** [`src/shared/ui/ThemeToggle`](src/shared/ui/ThemeToggle), shown in the header.
- **Logic:** [`src/shared/hooks/useTheme.ts`](src/shared/hooks/useTheme.ts) — reads the saved
  preference from `localStorage`/cookie on mount, falls back to the OS `prefers-color-scheme`, and uses
  the View Transitions API for a smooth cross-fade where supported.
- **No flash on load, no hydration mismatch:** the server ([`layout.tsx`](<src/app/[locale]/layout.tsx>))
  reads the `site-theme` cookie (or the `Sec-CH-Prefers-Color-Scheme` client hint on a first visit) and
  renders the correct `data-theme` attribute before any client JS runs.
- **Default theme:** change `DEFAULT_THEME` in `useTheme.ts` if you want light as the fallback.
- Every themed component reads its colors from the tokens above — there is no theme-specific component
  logic to duplicate when you add a new one.

---

## Animations

Two animation systems are used, each already tokenized:

- **Framer Motion** (entrance/exit transitions, page-level motion) — presets in
  [`src/shared/lib/motion/`](src/shared/lib/motion) (`fade-in`, `reveal`, `slide-down`, `stagger`,
  `page-transition`) read duration/easing from **[`src/shared/constants/motion.ts`](src/shared/constants/motion.ts)**
  (`MOTION_DURATION`, `MOTION_EASE`).
- **GSAP** (scroll-triggered reveals in each section) — the repeated "header slides in" pattern is a
  shared helper, **[`revealHeader`](src/shared/lib/animation/revealHeader.ts)**, built on the generic
  **[`revealOnScroll`](src/shared/lib/animation/revealOnScroll.ts)** primitive, both driven by
  `GSAP_DURATION`, `GSAP_EASE`, `MOTION_DISTANCE` and `MOTION_BLUR` in `motion.ts`.

**To make animations more subtle or more dynamic**, edit the values in
[`src/shared/constants/motion.ts`](src/shared/constants/motion.ts) — every preset and the shared GSAP
helpers pick up the change. Section-specific GSAP timelines (e.g. the carousel tween math, the timeline
track draw-in) keep their own fine-tuned values since they're purpose-built for that section's effect,
not generic entrance animation.

**Accessibility:** every animation hook checks `useReducedMotion()` (Framer) or the
`prefers-reduced-motion` media query (GSAP/CSS, via the `reduced-motion` mixin) and swaps to an instant,
non-animated state — components are never *required* to animate to function.

---

## Localization

Built on [`next-intl`](https://next-intl.dev), with full routing, middleware and typed locale support
already wired up.

- **Available locales out of the box:** `en`, `pl` (English is the fallback).
- **Single source of truth:** [`src/i18n/locales.ts`](src/i18n/locales.ts) — the `LOCALES` array (code,
  switcher label, OG locale) and `DEFAULT_LOCALE`. Routing (`src/i18n/routing.ts`), the message loader
  (`src/i18n/request.ts`), the language switcher, hreflang alternates and `sitemap.ts` all derive from
  this one file — none of them hold their own copy of the locale list.
- **UI chrome translations** (nav labels, button/tab copy, SEO description): `messages/<locale>.json`.
- **Content translations** (hero, services, cta, footer, reviews, ...): inline `i18n` blocks inside the
  entity's JSON in `src/entities/*/model/` — see [Content](#content).
- **Locale detection & routing:** [`src/proxy.ts`](src/proxy.ts) (Next.js middleware).
- **Language switcher UI:** [`src/shared/ui/LangSwitcher`](src/shared/ui/LangSwitcher) — reads `LOCALES`
  directly, nothing to keep in sync by hand.

**To add a language** (example: French, `fr`):

1. Add `{ code: "fr", label: "FR", ogLocale: "fr_FR" }` to `LOCALES` in `src/i18n/locales.ts`.
2. Create `messages/fr.json` (copy `messages/en.json` and translate, including the `seo.description` key).
3. Add an `"fr"` key to every `i18n` block across `src/entities/*/model/*.json` — English is the fallback
   for any locale you skip, so this can be done incrementally.

That's it — routing, the message loader, the language switcher, hreflang tags and the sitemap all pick
it up automatically.

**To remove a language:** delete its entry from `LOCALES` and delete its `messages/<code>.json` (step 3
above is optional cleanup).

---

## Content

Content lives one folder per entity under **[`src/entities/`](src/entities)**, separate from the
components that render it — e.g. `entities/hero/` holds `model/hero.json` (the data) +
`api/getHero.ts` (the fetcher). Every entity follows the same shape. The type each entity's JSON is
shaped like lives one level up, in **[`packages/content-schema`](../../packages/content-schema)** —
shared with the CMS that will eventually write that same JSON.

- Fields that differ per locale live inside an `i18n: { en: {...}, pl: {...} }` block in the JSON;
  fields that don't (ids, image paths, hrefs, a person's name) sit outside it. `get*(locale)` picks the
  right block — falling back to English if a locale is missing — and returns one flat, already-localized
  object/array, so components never see the raw `i18n` shape.
- All entities are read through **[`src/shared/api/contentStore.ts`](src/shared/api/contentStore.ts)**
  (local JSON, keyed by resource name) via
  **[`src/shared/api/contentClient.ts`](src/shared/api/contentClient.ts)**'s `fetchContent()`. Editing
  the JSON is enough — there's no API layer to configure by default.
- **Swapping a resource for a real CMS:** remove it from `contentStore.ts`'s map; `fetchContent()` then
  falls back to `` `${CONTENT_API_URL}/<resource>` `` for that resource only (see
  [Environment Variables](#environment-variables)).

---

## SEO

- **Per-locale metadata & JSON-LD:** [`src/app/[locale]/layout.tsx`](<src/app/[locale]/layout.tsx>) —
  the `jsonLd` object defaults to a `Person` schema, with `sameAs` built from `getSocials()`; swap
  `@type` to `Organization` (company/agency) or `Product` (SaaS) if that fits better.
- **Canonical / hreflang / OG url per page:** every route's own `generateMetadata` calls
  [`buildPageAlternates(locale, path)`](src/shared/lib/seo.ts) so `/works`, `/works/<slug>` and
  `/contact` each point at themselves instead of inheriting the locale root's URL from the layout.
- **Branding & site URL:** [`src/shared/config/site.config.ts`](src/shared/config/site.config.ts) —
  name, tagline, description, canonical URL. Social links live in
  [`entities/social/model/social.json`](src/entities/social/model/social.json) instead (single source
  of truth for both the footer icons and the JSON-LD `sameAs`).
- **Sitemap & robots:** [`src/app/sitemap.ts`](src/app/sitemap.ts) / [`src/app/robots.ts`](src/app/robots.ts)
  — both dynamic, both derive their domain from `siteConfig.url`.
- **OpenGraph / favicon images:** `public/og/cover.png` (1200×630, the site-wide default) and
  `public/icon/icon.png` (32×32). A `/works/<slug>` page overrides `og:image` with that project's own
  hero image — see `generateMetadata` in
  [`works/[[...slug]]/page.tsx`](<src/app/[locale]/works/[[...slug]]/page.tsx>).

---

## Environment Variables

```bash
cp .env.example .env.local
```

| Variable                     | Required                         | Description                                                                                                                         |
| ---------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`       | In production                    | Public base URL, used for canonical links, OpenGraph, `sitemap.xml` and `robots.txt`. Defaults to `http://localhost:3000` if unset. |
| `CONTENT_SOURCE`             | No                               | Set to `remote` in production to read editable JSON from R2. Defaults to bundled content.                                           |
| `CONTENT_CDN_URL`            | With remote content or R2 images | Public custom-domain base URL for R2, for example `https://cdn-dev.avrash.com`.                                                     |
| `CONTENT_REVALIDATE_SECONDS` | No                               | Fallback TTL for remote JSON. Defaults to `86400`; admin cache-tag invalidation still applies immediately.                          |
| `REVALIDATE_SECRET`          | With admin webhook               | Shared secret used by the admin to invalidate changed content through `/api/revalidate`.                                            |
| `CONTENT_API_URL`            | No                               | Base URL of a separate CMS API, used only when a resource is unavailable locally and in R2.                                         |

Analytics (`@vercel/analytics`, `@vercel/speed-insights`) are wired into the layout and are safe no-ops
outside of Vercel — remove the two components in `layout.tsx` if you don't want them.

---

## Creating a section

New page sections are widgets and follow the shape every existing one already uses:

```
src/widgets/<Name>Section/
├── <Name>Section.tsx           # component — reuse Section, Container, SectionHeader, Button, Tag...
├── <Name>Section.module.scss   # styles — reuse tokens from shared/styles, mixins from mixins.scss
├── use<Name>SectionAnimations.ts   # optional — GSAP scroll animations, reuse shared/lib/animation
└── index.ts                    # export { <Name>Section } from "./<Name>Section"
```

Minimal example — a `PricingSection` reusing the existing primitives:

```tsx
import { Container, Section, SectionHeader, Button } from "@/shared/ui";

export function PricingSection() {
    return (
        <Section id="pricing">
            <Container>
                <SectionHeader title="PRICING" />
                {/* your cards here — reuse Tag, Button, and the color/spacing tokens */}
            </Container>
        </Section>
    );
}
```

Then add it to [`page.tsx`](<src/app/[locale]/page.tsx>) and, if it should be in the nav, to
[`navigation.config.ts`](src/shared/config/navigation.config.ts) + `messages/*.json`.

## Removing a section

1. Remove the component import + JSX line from `page.tsx`.
2. Remove its entry from `navigation.config.ts` (if it had one) and the corresponding key from
   `messages/*.json`.
3. Delete its folder under `src/widgets/` and, if nothing else uses it, its entity under
   `src/entities/`.

---

## Scripts, Docker, CI, Deployment

All covered in the [root README](../../README.md) — scripts run through `pnpm --filter @avrash/web`
(or plain `pnpm run <script>` from inside this directory), the Docker build context is the monorepo
root (`packages/content-schema` and the lockfile live outside `apps/web`), same for CI.

---

## Example customization

```text
AI SaaS landing
  → site.config.ts: name = product name, title = tagline
  → entities/service/model/services.json: feature highlights
  → entities/review/model/reviews.json: customer testimonials
  → layout.tsx: JSON-LD @type = "Product" or "Organization"
  → Minimal deletion: none of the existing sections need to be removed.

Design agency landing
  → tokens.scss: swap --color-accent (and --color-bg / --color-text-primary) for the agency's brand colors
  → motion.ts: bump GSAP_DURATION / MOTION_DISTANCE for punchier motion, or lower them for restraint
  → site.config.ts + entities/*/model/*.json: agency name, services, client work
  → No theme/design architecture changes needed — only token values.

Developer / designer portfolio
  → site.config.ts: name = your name, title = your role
  → entities/project/model/projects.json: your work, one entry per case study
  → entities/review/model/reviews.json: client testimonials
  → layout.tsx: JSON-LD @type = "Person"
```

---

## Before Publishing

- [ ] Decide what you're building — see [Example customization](#example-customization)
- [ ] Set brand name, tagline and links in `src/shared/config/site.config.ts`
- [ ] Set brand colors in `src/shared/styles/tokens.scss` (`--color-accent`, plus `--color-bg` /
      `--color-text-primary` per theme)
- [ ] Replace the content under `src/entities/*/model/*.json` (and add real translations to each `i18n`
      block per locale)
- [ ] Replace `public/icon/icon.png` (favicon) and `public/og/cover.png` (social share image)
- [ ] Set `NEXT_PUBLIC_SITE_URL` for your production environment
- [ ] Update the JSON-LD `@type` in `src/app/[locale]/layout.tsx` (defaults to `Person`)
- [ ] Remove any languages you don't need, or add your own (see [Localization](#localization))
- [ ] Add or remove sections to match your composition (see [Creating](#creating-a-section) /
      [Removing](#removing-a-section) a section)
- [ ] Decide whether to keep Vercel Analytics/Speed Insights

---

## License

[MIT](LICENSE) — use this template for personal or commercial projects, no attribution required.
