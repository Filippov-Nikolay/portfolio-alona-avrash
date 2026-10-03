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
| `hero.ts`, `cta.ts`, `footer.ts`, `review.ts`, `service.ts`                          | TypeScript types   | Localized content: a stored `*Raw` shape with an `i18n` block, one locale's `*I18n` slice, and the resolved type |
| `social.ts`, `stat.ts`, `client.ts`, `tool.ts`, `icon.ts`, `home-project-gallery.ts` | TypeScript types   | Non-localized content                                                                                            |

**Why some files are Zod and others are types.** Admin can write projects, categories, tool badges
and the CV, so those files can come from R2 at runtime. They get Zod schemas, and both sides use
them: admin validates input before saving, and web validates what it fetches. The other files have
no editor yet and come only from the bundled `@avrash/content-data`, which TypeScript already checks.
A content type moves to Zod when it gets an editor.

## Changing the contract

- **New entity:** add `src/<name>.ts`, export it from `src/index.ts`, then build the data and the
  consumers against it.
- **New locale:** add it to `SITE_LOCALES`. Web routing, the language switcher, `hreflang`, the
  sitemap and admin's CV page pick it up automatically. Content without a translation falls back to
  English.

## Scripts

| Command           | What it does                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `pnpm test`       | Vitest: schemas reject invalid data, CV fallback order, legacy CV format |
| `pnpm type-check` | TypeScript                                                               |

The tests run in both the web and the admin CI workflows.
