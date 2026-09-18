# @avrash/content-schema

The shared contract between `apps/web` and the future CMS (`apps/admin`) - plain TypeScript types, no
runtime code. Each file describes the shape of one content entity's JSON exactly as it's meant to be
stored (locally today, on Cloudflare R2 once the CMS exists):

- `hero.ts`, `cta.ts`, `footer.ts`, `review.ts`, `service.ts` - each exports a `*Raw` type (what's
  actually stored: an `i18n: Record<locale, ...>` block for the fields that differ per locale, plus
  whatever doesn't), an `*I18n` type (one locale's slice of that block), and a resolved flat type (what
  `apps/web`'s `get*(locale)` fetchers return after picking one locale - see `apps/web`'s
  `resolveLocaleContent()`).
- `project.ts`, `social.ts`, `stat.ts`, `client.ts`, `tool.ts`, `home-project-gallery.ts` - flat types,
  no localization.
- `project-image.ts`, `category.ts` - subtypes several of the above depend on.

**Why this exists:** the CMS will edit exactly this JSON and needs the exact same shapes to build its
edit forms and validate what it writes - if the site and the CMS each kept their own copy of "what a
hero.json looks like," they'd drift out of sync silently. This package is the one place that shape is
defined; both sides import from here instead of redeclaring it.

**Adding a locale to an existing field:** add the key to the relevant `*I18n` interface - TypeScript
will then flag every JSON file (via its `Record<string, X>` i18n block) and every consumer that isn't
handling it yet.

**Adding a new entity:** create `src/<name>.ts` here first (its `*Raw`/`*I18n`/resolved shape), export
it from `src/index.ts`, then build the `apps/web` side (JSON + `get*.ts` fetcher) against it - this
package is the contract to design against, not an afterthought once the JSON already exists.
