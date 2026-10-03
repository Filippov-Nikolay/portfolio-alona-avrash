# @avrash/content-data

The site's content as JSON, typed against [`@avrash/content-schema`](../content-schema/README.md).

- **Web** bundles it as the default content source and as the fallback when R2 is unreachable or a
  file is missing there.
- **Admin's filesystem driver** writes to these files during local development, and the web dev
  server picks the changes up immediately.
- **In production**, admin writes to R2 instead. This package is then the snapshot that ships with
  each web build.

- **Edited in admin:** `projects.json`, `categories.json`, `tool-badges.json`, `cv.json`.
- **Edited by hand** (no admin editor yet): `hero.json`, `services.json`, `reviews.json`,
  `cta.json`, `footer.json`, `stats.json`, `clients.json`, `tools.json`, `social.json`,
  `home-project-gallery.json`, `icon.json`. In production the live copy is the file in R2: edit it
  there, revalidate the tag, and copy the result back here so the fallback stays current.

[`src/index.ts`](src/index.ts) exports each file typed as its schema type, so both apps get typed
data instead of `unknown`.

## Tests

`pnpm test` validates every file against its schema from `CONTENT_RESOURCES` and checks that every
JSON file here is registered. It runs in the web and admin CI workflows, so a broken edit to the
snapshot fails CI with the exact field path.

The E2E suite does not read this package. It runs on a frozen copy in `e2e/fixtures/content`, so
editing the content here never breaks a browser test.

## Adding content

1. Define its schema in `@avrash/content-schema` and register it in `CONTENT_RESOURCES`.
2. Add the `.json` file here and a typed export in `src/index.ts`.
3. In web, add it to `shared/api/contentStore.ts` and add an entity fetcher that calls
   `fetchContent("<resource>")`.
