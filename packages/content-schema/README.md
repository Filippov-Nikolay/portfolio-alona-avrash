# @avrash/content-schema

The contract between [`apps/web`](../../apps/web/README.md) and [`apps/admin`](../../apps/admin/README.md):
the shape of every content file, defined once and imported by both apps. If each app kept its own
copy of "what `projects.json` looks like", they would drift apart without any error.

## Contents

| Module                                                                               | Kind               | Used for                                                                                                         |
| ------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `project.ts`, `project-image.ts`                                                     | Zod schemas        | Projects and their gallery images, including GIF `posterSrc` and focal points                                    |
| `category.ts`, `tool-badge.ts`                                                       | Zod schemas        | Options admin can add and remove                                                                                 |
| `cv.ts`                                                                              | Zod schema + logic | Per-language CV metadata, size limit, and `resolveCv()` fallback (own language, then English, then any)          |
| `locale.ts` (also `@avrash/content-schema/locale`)                                   | Constants          | `SITE_LOCALES` and `DEFAULT_SITE_LOCALE`, shared by web routing and admin's CV page                              |
| `hero.ts`, `cta.ts`, `footer.ts`, `review.ts`, `service.ts`                          | Zod schemas        | Localized content: a stored `*Raw` shape with an `i18n` block, one locale's `*I18n` slice, and the resolved type |
| `social.ts`, `stat.ts`, `client.ts`, `tool.ts`, `icon.ts`, `home-project-gallery.ts` | Zod schemas        | Non-localized content. Their images use `ContentImage`, which has no gallery `id` or `order`                     |
| `localized.ts`                                                                       | Helper             | `i18n` blocks keyed by locale that must include the default locale, the one web falls back to                    |
| `resources.ts`                                                                       | Registry           | `CONTENT_RESOURCES`: the file name and schema of every content resource, and the `ContentOf<R>` type             |

**Why everything is Zod.** Every content file can be edited in R2, through admin or by hand, so
none of them is trusted at runtime:

- admin validates input before saving;
- web validates every resource it reads and falls back to the bundled copy when R2 holds something
  invalid;
- `@avrash/content-data` tests that the bundled snapshot matches these schemas and that every file
  in it is registered.

## Changing the contract

- **New entity:** add `src/<name>.ts` with its schema, register it in `CONTENT_RESOURCES`, export it
  from `src/index.ts`, then add the data and the consumers. The content-data test fails until the
  file and the registry entry both exist.
- **New locale:** add it to `SITE_LOCALES`. Web routing, the language switcher, `hreflang`, the
  sitemap and admin's CV page pick it up automatically. Content without a translation falls back to
  English.

## Scripts

| Command           | What it does                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `pnpm test`       | Vitest: schemas reject invalid data, CV fallback order, legacy CV format |
| `pnpm type-check` | TypeScript                                                               |

The tests run in both the web and the admin CI workflows.
