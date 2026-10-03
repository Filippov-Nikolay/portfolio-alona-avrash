# @avrash/admin

The CMS for [avrash.com](https://avrash.com): a password-protected Next.js 16 app where the site
owner manages projects, media, the CV, and reads visitor analytics. It writes content in the shapes
defined by [`@avrash/content-schema`](../../packages/content-schema/README.md).
[`apps/web`](../web/README.md) reads that content from R2. The two apps never call each other's code.

Setup for the whole monorepo is in the [root README](../../README.md).

---

## Features

### Works / Projects

- Sortable project table, plus create, edit and delete.
- Project form, split into sections:
    - details;
    - categories and tools, as chips;
    - publication: featured in Selected Work on the home page, with a rank;
    - card colors and the showcase accent;
    - a danger zone for deleting the project.
- Unsaved changes are kept as a local draft, so they survive a reload and can be restored.
- Image gallery: upload, drag-and-drop ordering, a hero image, alt text and a layout per image.
- GIF uploads get a WebP poster of the first frame, generated with `sharp` and stored next to the
  GIF. If the poster cannot be stored, the uploaded GIF is removed again. Deleting a project or an
  image also deletes the poster.
- **Live preview** renders the draft with the site's own `WorksCard` and `ShowcaseModal` from
  [`@avrash/ui`](../../packages/ui/README.md), so what you see is what web shows.
- Every save is validated with `ProjectInputSchema` on the server, and then the matching cache tag
  on web is invalidated.

### Global

- **CV:** one PDF per site language, with a PDF.js preview, replace and delete. The page also shows
  which fallback visitors get for languages without their own PDF. Details are in
  [`entities/cv/README.md`](src/entities/cv/README.md).
- **Categories** and **tool badges:** add and remove the options used by the project form.
- **Socials** and **footer:** read-only JSON view.

### Home, Contact

Read-only JSON views of the current content. These sections have no editors yet; their content is
changed in [`packages/content-data`](../../packages/content-data/README.md).

### Dashboard

Reads reports from [`apps/analytics-worker`](../analytics-worker/README.md). The period can be 7, 30
or 90 days, or one year.

- **Analytics:** project opens, contact conversion, top projects with CTR and gallery view rate,
  and popular categories. Each project also has its own page with a timeline, countries and
  languages.
- **Traffic:** page views, visitors and sessions over time; top pages; and breakdowns by country,
  language, referrer, device, OS and browser. Also UTM campaigns, CV downloads by language, social
  clicks, and funnels: project open to gallery or website, and contact started to sent.

Until the worker is configured, the dashboard shows a "not connected" notice instead.

### System info

The version tag in the navigation opens a panel with the version, commit and environment of the
running deployment.

---

## Authentication

- Every route except `/login` goes through [`proxy.ts`](src/proxy.ts), which verifies a signed
  session cookie (HS256 JWT via `jose`, valid for 7 days).
- Users come from `ADMIN_USERS`: a base64-encoded JSON array of `{ login, passwordHash }` with
  bcrypt hashes. No plaintext passwords are stored anywhere.
- Login attempts are rate-limited per IP (5 attempts / 10 minutes).
- Server Actions and API routes check the session themselves too, not only through the proxy.
  Routes that change data also check the request origin.

---

## Storage drivers

The repositories in [`shared/storage`](src/shared/storage) write to one of two backends, selected by
`ADMIN_STORAGE_DRIVER`:

| Driver                 | Content JSON                       | Uploaded images                      | Use for                     |
| ---------------------- | ---------------------------------- | ------------------------------------ | --------------------------- |
| `filesystem` (default) | `packages/content-data/src/*.json` | `apps/web/public/projects/uploads/`  | Local development           |
| `r2`                   | `content/*.json` in the R2 bucket  | `projects/uploads/` in the R2 bucket | Production (separate hosts) |

Uploaded file names include a timestamp and are served with an immutable cache header, so a
replaced image never shows a stale version. `ADMIN_CONTENT_DIR` redirects filesystem writes to
another directory. The E2E suite uses it to work on a scratch copy instead of real content.

---

## Project structure

```
src/
├── app/
│   ├── login/                 # Sign-in page
│   ├── works/projects/        # Project list, create, edit
│   ├── global/                # cv, categories, tool-badges
│   ├── dashboard/             # analytics, analytics/[id], traffic
│   ├── [page]/[section]/      # Read-only JSON view for sections without an editor
│   └── api/cv/                # Authenticated CV upload, preview, delete
├── widgets/                   # ProjectForm, ProjectsTable, PreviewStage, CvManager, dashboards, AdminNav, ...
├── entities/                  # project, category, toolBadge, cv, analytics, session: repositories and Server Actions
├── shared/
│   ├── auth/                  # Credentials, session tokens, requireAdminSession
│   ├── storage/               # filesystem and R2 drivers, image storage
│   ├── lib/                   # GIF posters, web revalidation, rate limit, slugify
│   ├── config/                # Navigation, build info
│   └── ui/                    # Button, ConfirmDialog, LineChart, ReportTabs, ...
└── proxy.ts                   # Session gate
scripts/
└── backfill-gif-posters.mjs   # Generates posters for GIFs uploaded before posters existed
```

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env`. It explains each value and how to generate it.

| Variable                                                                      | When needed    | Purpose                                                                 |
| ----------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `ADMIN_USERS`                                                                 | Always         | Base64 JSON array of `{ login, passwordHash }`                          |
| `SESSION_SECRET`                                                              | Always         | Signs session cookies. Changing it signs everyone out                   |
| `ADMIN_STORAGE_DRIVER`                                                        | Production     | `r2` to write to Cloudflare R2                                          |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | With `r2`      | R2 credentials and bucket                                               |
| `R2_PUBLIC_URL_BASE`                                                          | With `r2`      | Public bucket URL. Same value as web's `CONTENT_CDN_URL`                |
| `WEB_REVALIDATE_URL`                                                          | Production     | Web's `/api/revalidate` URL                                             |
| `REVALIDATE_SECRET`                                                           | With the above | Must match web's `REVALIDATE_SECRET`                                    |
| `ANALYTICS_WORKER_URL`                                                        | Dashboard      | Base URL of the analytics worker                                        |
| `ANALYTICS_READ_SECRET`                                                       | Dashboard      | Must match the worker's `ANALYTICS_READ_SECRET`                         |
| `ADMIN_CONTENT_DIR`                                                           | Optional       | Alternative content directory for the filesystem driver                 |
| `NEXT_PUBLIC_ASSET_BASE_URL`                                                  | Optional       | Where previews load root-relative images from (default: web dev server) |

---

## Scripts

| Command                                           | What it does                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                                        | Dev server on http://localhost:3001                                        |
| `pnpm build` / `pnpm start`                       | Production build and server (port 3001)                                    |
| `pnpm test`                                       | Vitest: auth, repositories, uploads, GIF posters, API routes               |
| `pnpm lint` / `pnpm type-check`                   | ESLint and TypeScript                                                      |
| `pnpm backfill:gif-posters [--dry-run] [--force]` | Creates missing GIF posters using the configured driver, then notifies web |

Browser flows (login, logout, create and edit a project, image upload, CV) are covered in
[`e2e/tests/admin`](../../e2e/README.md).

---

## Deployment

A separate Vercel project with `apps/admin` as the root directory, `ADMIN_STORAGE_DRIVER=r2`, and
the secrets above. Vercel provides the commit and environment shown in the system info panel.
