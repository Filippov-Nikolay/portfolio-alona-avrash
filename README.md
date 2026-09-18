# Landing Page Starter

> A reusable, production-ready frontend foundation for building modern landing pages — clone it,
> restyle it, swap the content, and ship.

This is not a finished product for one specific use case. It's a **design system + composable
sections + infrastructure** (theme, i18n, SEO, animation) that you build your next landing page on top
of — whether that's a SaaS, an AI product, a startup, an agency site, a developer portfolio, or a
product presentation.

## Suitable for

Nothing in the architecture assumes a specific business domain:

- **SaaS / AI product landing pages** — Showcase = feature highlights, Timeline = changelog/roadmap
- **Agencies & studios** — Showcase/Gallery = client work, Timeline = company milestones
- **Developer / designer portfolios** — Showcase/Gallery = your projects, Timeline = work experience
- **Startups & product presentations** — Showcase = product highlights, CTA = waitlist/signup
- **Any other single-page marketing site** that needs a hero, a features grid, a showcase, and a
  contact call-to-action

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
- **Composable sections** — Hero, Showcase, Features, Gallery, Timeline, Contact/CTA, Footer — each
  independent, removable, and reusing the same UI primitives
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

```bash
git clone <your-fork-url> my-landing-page
cd my-landing-page
npm install
cp .env.example .env.local
npm run dev       # http://localhost:3000
```

Requires Node.js 22+ (see `.nvmrc`).

---

## Architecture

Layers follow [Feature-Sliced Design](https://feature-sliced.design): `app` → `widgets` → `shared`
(`entities`/`features` are reserved for when the project grows a real domain — see below).

```
src/
├── app/
│   └── [locale]/          # Pages, layout, loading/error states (locale-prefixed routes)
├── i18n/                  # next-intl routing, middleware, request handling
├── widgets/                # Self-contained UI blocks, composable, independent, no cross-imports
│   ├── Header/, Footer/, Preloader/  # Global chrome, rendered once in layout.tsx
│   ├── HeroSection/
│   ├── ShowcaseSection/       # Featured items carousel
│   ├── FeaturesSection/        # Capabilities / "what's included" block
│   ├── GallerySection/          # Secondary showcase: featured item + browsable collection
│   ├── TimelineSection/           # Generic timeline (history, roadmap or work experience)
│   └── ContactSection/              # CTA + contact links
└── shared/
    ├── config/               # site.config.ts, navigation.config.ts, env.ts — BRANDING
    ├── content/                # features.json, timeline.json, showcase.json, gallery.json — CONTENT
    ├── types/                   # TypeScript contracts for every content shape
    ├── ui/                       # Reusable UI kit — see "Reusable UI" below
    ├── constants/                  # colors.ts, motion.ts, breakpoints.ts, layers.ts — TOKENS (JS side)
    ├── styles/                      # tokens.scss, typography.scss, mixins.scss — TOKENS (CSS side)
    ├── lib/, hooks/, providers/       # Infrastructure — rarely needs edits
```

There is no separate "sections" layer — a landing-page block like `HeroSection` or `FeaturesSection` is,
by FSD's own definition, a widget: a self-contained composition with no reuse requirement beyond being
assembled into a page. `src/entities/` and `src/features/` are kept as empty placeholders for when the
project grows an actual domain (e.g. a real `product` or `user` entity) — safe to ignore or delete
otherwise.

This separation is deliberate: **infrastructure**, **design system**, **reusable UI**, **widgets**,
**demo content** and **project configuration** each live in their own place, so changing one rarely
touches the others. Branding lives in `shared/config`, demo copy lives in `shared/content`,
colors/spacing/type live in `shared/styles` + `shared/constants`, and layout/animation primitives live
in `shared/ui` + `shared/lib`.

### Page composition

The homepage is assembled explicitly in [`src/app/[locale]/page.tsx`](<src/app/[locale]/page.tsx>) —
there's no page-builder, CMS or JSON-driven rendering engine, just JSX:

```tsx
<HeroSection />
<ShowcaseSection ... />
<FeaturesSection ... />
<GallerySection ... />
<TimelineSection ... />
<ContactSection />
```

`Header` and `Footer` are rendered once in [`layout.tsx`](<src/app/[locale]/layout.tsx>), outside the
per-page composition. Every page-composition widget only depends on `shared/`, never on another widget
— that means:

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
multi-color palette (orange/blue/purple/red) used only to tell showcase/gallery cards apart — it does not
follow the single site accent.

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
`Button`, the same way `FeaturesSection` does today.

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
- **UI chrome translations** (nav labels, hero/contact/footer copy, SEO description): `messages/<locale>.json`.
- **Content translations** (timeline, showcase/gallery items): inline `i18n` blocks inside each file in
  `src/shared/content/`.
- **Locale detection & routing:** [`src/proxy.ts`](src/proxy.ts) (Next.js middleware).
- **Language switcher UI:** [`src/shared/ui/LangSwitcher`](src/shared/ui/LangSwitcher) — reads `LOCALES`
  directly, nothing to keep in sync by hand.

**To add a language** (example: French, `fr`):

1. Add `{ code: "fr", label: "FR", ogLocale: "fr_FR" }` to `LOCALES` in `src/i18n/locales.ts`.
2. Create `messages/fr.json` (copy `messages/en.json` and translate, including the `seo.description` key).
3. Add an `"fr"` key to every `i18n` block in `src/shared/content/*.json` — English is the fallback for
   any locale you skip, so this can be done incrementally.

That's it — routing, the message loader, the language switcher, hreflang tags and the sitemap all pick
it up automatically.

**To remove a language:** delete its entry from `LOCALES` and delete its `messages/<code>.json` (step 3
above is optional cleanup).

---

## Content

Content lives in **[`src/shared/content/`](src/shared/content)**, separate from the components that
render it:

- `features.json` — intro copy, status line, highlight card, capability groups
- `showcase.json` — the featured carousel under the hero
- `gallery.json` — the secondary showcase (one featured item + a browsable collection)
- `timeline.json` — dated entries (history, roadmap, or work experience)

All typed via [`src/shared/types/`](src/shared/types) (`FeaturesData`, `ShowcaseCarouselData`,
`GalleryData`, `TimelineData`). Data is read directly in Server Components via
[`src/shared/lib/showcase/resolveShowcase.ts`](src/shared/lib/showcase/resolveShowcase.ts) — editing
the JSON is enough, there's no API layer to configure.

**Images are optional** on showcase/gallery items. Omit `src` and the card falls back to a colored ring
with the item's initials — every example item in this template does exactly that.

### Streaming sections with real data

Every section in this template reads static JSON today, so there's nothing to stream — but one widget,
**[`TimelineSection`](src/widgets/TimelineSection)**, is set up as a working reference for the day you
replace static content with a real data source (a CMS, a database, an internal API).

It's split in two:

```
src/widgets/TimelineSection/
├── TimelineSection.tsx         # async Server Component — the data-fetching boundary
├── TimelineSectionClient.tsx   # "use client" — rendering, animation, interactivity (unchanged)
└── TimelineSkeleton.tsx        # loading placeholder, same layout as the real content
```

`TimelineSection` is declared `async` and currently just resolves the local JSON import — but the
function body is exactly where a real `await fetch(...)` or database call would go. `page.tsx` wraps it
in `<Suspense>`:

```tsx
<Suspense fallback={<TimelineSkeleton />}>
    <TimelineSection />
</Suspense>
```

The rest of the page renders immediately; Timeline streams in independently once its data resolves. To
apply this pattern to another section: split it the same way (async server wrapper that fetches + a
`"use client"` component that receives the resolved data as props + a matching `*Skeleton`), then wrap
it in `page.tsx` the same way.

---

## SEO

- **Per-locale metadata & JSON-LD:** [`src/app/[locale]/layout.tsx`](<src/app/[locale]/layout.tsx>) —
  `LOCALE_META` (title/description per locale) and the `jsonLd` object default to a generic `WebSite`
  schema; swap `@type` to `Person` (portfolio), `Organization` (company/agency) or `Product` (SaaS).
- **Branding & site URL:** [`src/shared/config/site.config.ts`](src/shared/config/site.config.ts) —
  name, tagline, description, canonical URL, social links. Everything above reads from here.
- **Sitemap & robots:** [`src/app/sitemap.ts`](src/app/sitemap.ts) / [`src/app/robots.ts`](src/app/robots.ts)
  — both dynamic, both derive their domain from `siteConfig.url`.
- **OpenGraph / favicon images:** `public/og/cover.png` (1200×630) and `public/icon/icon.png` (32×32) —
  currently neutral placeholders, replace before publishing.

---

## Environment Variables

```bash
cp .env.example .env.local
```

| Variable               | Required   | Description                                                                 |
| ----------------------- | ---------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | In production | Public base URL, used for canonical links, OpenGraph, `sitemap.xml` and `robots.txt`. Defaults to `http://localhost:3000` if unset. |
| `CONTENT_API_URL`       | No | Base URL of an external CMS API. Content (hero, socials, projects, ...) ships as local JSON under `src/entities/*/model` and is used as-is — this is only a fallback for a resource not found there. |

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
3. Delete its folder under `src/widgets/` and, if nothing else uses it, its file(s) under
   `src/shared/content/`.

---

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # start production build
npm run lint          # ESLint check
npm run lint:fix      # ESLint autofix
npm run type-check    # TypeScript check (no emit)
npm run format         # Prettier format
npm run format:check  # Prettier check only
```

---

## Docker

```bash
docker compose up --build
# or
docker build -t my-landing-page .
docker run -p 3000:3000 my-landing-page
```

Multi-stage `Dockerfile`: `builder` installs deps and runs `next build`; `runner` is a minimal
`node:22-alpine` image running as a non-root user, using `output: standalone`.

---

## CI

GitHub Actions runs `install → lint → type-check → build` on every push/PR to `main`. See
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Deployment

Standard Next.js app, deploys anywhere Next.js runs.

**Vercel** — connect the repo, set `NEXT_PUBLIC_SITE_URL`, deploy.

**Docker / any VPS** — `docker compose up -d`, then reverse-proxy to `localhost:3000`.

**Any other Node host** (Railway, Render, Fly.io, etc.) — `npm run build && npm run start`.

---

## Example customization

```text
AI SaaS landing
  → site.config.ts: name = product name, title = tagline
  → showcase.json / gallery.json: feature highlights or case studies
  → timeline.json: changelog / roadmap entries
  → layout.tsx: JSON-LD @type = "Product" or "Organization"
  → Minimal deletion: none of the existing sections need to be removed.

Design agency landing
  → tokens.scss: swap --color-accent (and --color-bg / --color-text-primary) for the agency's brand colors
  → motion.ts: bump GSAP_DURATION / MOTION_DISTANCE for punchier motion, or lower them for restraint
  → site.config.ts + content/*.json: agency name, services, client work, milestones
  → No theme/design architecture changes needed — only token values.

Developer / designer portfolio
  → site.config.ts: name = your name, title = your role
  → showcase.json / gallery.json: your projects (secondaryHref = GitHub links)
  → timeline.json: title = company, subtitle = role → your work experience
  → layout.tsx: JSON-LD @type = "Person"
```

---

## Before Publishing

- [ ] Decide what you're building — see [Example customization](#example-customization)
- [ ] Set brand name, tagline and links in `src/shared/config/site.config.ts`
- [ ] Set brand colors in `src/shared/styles/tokens.scss` (`--color-accent`, plus `--color-bg` /
      `--color-text-primary` per theme)
- [ ] Replace the content in `src/shared/content/*.json` (features, showcase, gallery, timeline)
- [ ] Replace `public/icon/icon.png` (favicon) and `public/og/cover.png` (social share image)
- [ ] Set `NEXT_PUBLIC_SITE_URL` for your production environment
- [ ] Update `LOCALE_META` and the JSON-LD `@type` in `src/app/[locale]/layout.tsx`
- [ ] Remove any languages you don't need, or add your own (see [Localization](#localization))
- [ ] Add or remove sections to match your composition (see [Creating](#creating-a-section) /
      [Removing](#removing-a-section) a section)
- [ ] Decide whether to keep Vercel Analytics/Speed Insights

---

## License

[MIT](LICENSE) — use this template for personal or commercial projects, no attribution required.
