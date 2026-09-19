import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deleteFile } from "./fs";
import { getStorageDriver } from "./driver";
import { deleteObject, r2PublicUrl, writeObject } from "./r2";

export interface ImageStorage {
    upload(fileName: string, buffer: Buffer, contentType: string): Promise<{ src: string }>;
    delete(src: string): Promise<void>;
}

const PUBLIC_PATH_PREFIX = "/projects/uploads";
const R2_KEY_PREFIX = "projects/uploads";

// Writes straight into apps/web's own public/ folder - only works when
// admin and web share a filesystem (local dev, or a single deployment).
// ADMIN_CONTENT_DIR (set only by the Playwright E2E suite) redirects this to
// a scratch directory instead, same as contentDataDir() - the returned src
// still points at /projects/uploads/<file> either way, so a test-mode
// upload's src won't actually resolve over HTTP from web's dev server. That
// is an accepted tradeoff: E2E assertions check the upload flow's DOM state
// (the gallery gained an item with this filename), not that the pixels
// render, in exchange for test runs never writing into the real, committed
// public/projects/uploads directory.
function uploadDir(): string {
    const contentDir = process.env.ADMIN_CONTENT_DIR;
    if (contentDir) return path.join(contentDir, "uploads");
    return path.join(process.cwd(), "..", "web", "public", "projects", "uploads");
}

const fileSystemImageStorage: ImageStorage = {
    async upload(fileName, buffer) {
        const dir = uploadDir();
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, fileName), buffer);
        return { src: `${PUBLIC_PATH_PREFIX}/${fileName}` };
    },
    async delete(src) {
        if (!src.startsWith(`${PUBLIC_PATH_PREFIX}/`)) return;
        const fileName = src.slice(PUBLIC_PATH_PREFIX.length + 1);
        await deleteFile(path.join(uploadDir(), fileName));
    },
};

const r2ImageStorage: ImageStorage = {
    async upload(fileName, buffer, contentType) {
        const key = `${R2_KEY_PREFIX}/${fileName}`;
        await writeObject(key, buffer, contentType);
        // Absolute URL, unlike the filesystem driver's root-relative path -
        // assetUrl() (shared/config/assets.ts) already passes absolute
        // URLs through unchanged, and web renders whatever src it's given.
        return { src: r2PublicUrl(key) };
    },
    async delete(src) {
        const prefix = `${r2PublicUrl(R2_KEY_PREFIX)}/`;
        if (!src.startsWith(prefix)) return;
        const key = `${R2_KEY_PREFIX}/${src.slice(prefix.length)}`;
        await deleteObject(key);
    },
};

export function getImageStorage(): ImageStorage {
    return getStorageDriver() === "r2" ? r2ImageStorage : fileSystemImageStorage;
}
