# Portfolio — Alona Avrash

A `pnpm` monorepo for Alona Avrash's portfolio site and (eventually) the CMS that edits its content.

```
apps/
├── web/     # the public Next.js site — see apps/web/README.md for everything about it
└── admin/   # placeholder for the CMS, not started yet — see apps/admin/README.md
packages/
└── content-schema/   # TypeScript types both apps/web and (later) apps/admin agree on
```

The two apps never import each other directly. `content-schema` is the contract between them: it
describes the shape of every piece of content (hero, services, projects, reviews, ...) as plain
TypeScript types, with no runtime code — `apps/web` reads content matching those shapes today from
local JSON, and the CMS will eventually write content matching those same shapes to Cloudflare R2,
which `apps/web` will read directly (not through the CMS's API — see `packages/content-schema` for the
full plan once it's written up there).

---

## Getting Started

```bash
git clone <repo-url> portfolio-alona-avrash
cd portfolio-alona-avrash
pnpm install
pnpm --filter @avrash/web run dev     # http://localhost:3000
```

Requires Node.js 22+ (see `.nvmrc`) and `pnpm` (see `packageManager` in `package.json`; `corepack
enable` will fetch the pinned version automatically).

---

## Scripts

Run from the root, fan out to every workspace member that defines the script:

```bash
pnpm run build         # pnpm -r --if-present run build
pnpm run lint
pnpm run type-check
pnpm run format         # repo-wide, not per-package (prettier . --write)
pnpm run format:check
```

To target one app specifically: `pnpm --filter @avrash/web run <script>` (or `pnpm --filter
@avrash/content-schema run type-check`). `pnpm run dev` always targets `@avrash/web` — it's the only
app with anything to serve right now.

---

## Docker

Build context is the repo root (the image needs `pnpm-lock.yaml` and `packages/content-schema`, both
outside `apps/web/`):

```bash
docker compose up --build
# or
docker build -t avrash-web -f apps/web/Dockerfile .
docker run -p 3000:3000 avrash-web
```

Multi-stage `apps/web/Dockerfile`: `builder` installs the whole workspace with `pnpm` and runs `pnpm
--filter @avrash/web run build`; `runner` is a minimal `node:22-alpine` image running as a non-root
user, using Next's `output: standalone`.

---

## CI

GitHub Actions runs `pnpm install → lint → type-check → build` against `@avrash/web` on every push/PR
to `main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Deployment

**Vercel** — connect the repo, set the root directory to `apps/web`, set `NEXT_PUBLIC_SITE_URL`, deploy.

**Docker / any VPS** — `docker compose up -d`, then reverse-proxy to `localhost:3000`.

**Any other Node host** (Railway, Render, Fly.io, etc.) — `pnpm install && pnpm --filter @avrash/web
run build && pnpm --filter @avrash/web run start`.

---

## License

[MIT](LICENSE).
