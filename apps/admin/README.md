# CMS (placeholder)

Nothing lives here yet. This is reserved for the real CMS - a separate service deployed at
`admin.<domain>.com`, writing content JSON to Cloudflare R2 in the same shapes as
[`packages/content-schema`](../../packages/content-schema). The public site (`apps/web`) reads that
content directly from R2/CDN, not through this service - this app is the write path only.

When work on it starts, this becomes a real workspace member with its own `package.json` (currently
absent on purpose, so `pnpm-workspace.yaml`'s `apps/*` glob skips it).
