# @avrash/content-data

The site's content as JSON, typed against [`@avrash/content-schema`](../content-schema/README.md).

- **Web** bundles it as the default content source and as the fallback when R2 is unreachable or a
  file is missing there.
- **Admin's filesystem driver** writes to these files during local development, and the web dev
  server picks the changes up immediately.
- **In production**, admin writes to R2 instead. This package is then the snapshot that ships with
  each web build.

- **Edited in admin:** `projects.json`, `categories.json`, `tool-badges.json`, `cv.json`.
- **Edited here** (no admin editor yet): `hero.json`, `services.json`, `reviews.json`, `cta.json`,
  `footer.json`, `stats.json`, `clients.json`, `tools.json`, `social.json`,
  `home-project-gallery.json`, `icon.json`.

[`src/index.ts`](src/index.ts) exports each file typed as its schema type, so both apps get typed
data instead of `unknown`.

## Adding content

1. Define its shape in `@avrash/content-schema`.
2. Add the `.json` file here and a typed export in `src/index.ts`.
3. In web, register the resource in `shared/api/contentStore.ts` and `contentClient.ts`, and add an
   entity fetcher.
