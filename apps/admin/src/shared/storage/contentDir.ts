import path from "node:path";

// Base directory the filesystem storage driver reads/writes content JSON
// under. Normally packages/content-data/src, so admin and web share a
// filesystem in local dev (see driver.ts). ADMIN_CONTENT_DIR overrides it -
// set only by the Playwright E2E suite, which points it at a scratch
// directory so test runs never touch real project data.
export function contentDataDir(): string {
    return (
        process.env.ADMIN_CONTENT_DIR ??
        path.join(process.cwd(), "..", "..", "packages", "content-data", "src")
    );
}
