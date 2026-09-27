# CV

`Global → CV` manages one PDF shared by all website languages. Selecting a file only creates a local preview; **Save CV** uploads and publishes it. Replacing a CV keeps the previous file available until the new upload and metadata write both succeed. Deleting unpublishes the CV and disables the website's download buttons on the next page load. Hover, keyboard focus, or tap reveals an unavailable label inside the button, without changing its size.

- PDF only, up to 4 MiB (leaves room for multipart data within the deployment's request limit).
- Metadata: `cv.json`, validated by `CvContentSchema`; `null` means unpublished.
- Filesystem: metadata and `cv/uploads/<uuid>.pdf` live under `contentDataDir()`. Web reads this directory at request time, so changing a CV does not require rebuilding.
- R2: `content/cv.json` plus `cv/uploads/<uuid>.pdf`, using the existing storage credentials. The `cv` revalidation tag uses the existing `WEB_REVALIDATE_URL` / `REVALIDATE_SECRET` setup. Without that webhook, the configured remote-content cache TTL applies.
- Public downloads go through web's `/api/cv`, with attachment headers and no browser cache. The header and mobile menu always render the control; without a published CV it has no download URL, is marked disabled, and shows a localized unavailable message.
- Admin's authenticated `/api/cv` handles preview, upload and deletion. Mutations check the request origin as well as the admin session.
- PDF.js loads only when a preview is needed. It renders one page at a time, uses a worker, caps canvas resolution, and releases the document and blob URL when replaced or closed. Its versioned assets are served locally; no third-party PDF service receives the file.

Tests: `cvRepository.test.ts`, admin and web `api/cv/route.test.ts`, and `e2e/tests/admin/cv.spec.ts`. Browser mutations must run against the E2E server's isolated `ADMIN_CONTENT_DIR`, not real content.
