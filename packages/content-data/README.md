# @avrash/content-data

The actual content JSON, typed against `@avrash/content-schema`. This is the local stand-in for what
will eventually live on Cloudflare R2: `apps/web` reads from here to render the site, and `apps/admin`
reads from the exact same files to display/edit them - one copy, not two that can drift apart.

Each `.ts` export in `src/index.ts` casts the matching `.json` file to its `@avrash/content-schema`
type, so both consumers get typed data instead of `unknown`.

**Adding an entity's data:** add the `.json` file here, add its typed export to `src/index.ts` against
the corresponding `@avrash/content-schema` type (add that type first if it doesn't exist yet), then
wire up the consumer.
