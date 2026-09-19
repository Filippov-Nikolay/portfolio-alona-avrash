import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deleteFile } from "./fs";
import { getStorageDriver } from "./driver";
import { deleteObject, r2PublicUrl, writeObject } from "./r2";

export interface ImageStorage {
    upload(fileName: string, buffer: Buffer, contentType: string): Promise<{ src: string }>;
    delete(src: string): Promise<void>;
}

// Writes straight into apps/web's own public/ folder - only works when
// admin and web share a filesystem (local dev, or a single deployment).
const UPLOAD_DIR = path.join(process.cwd(), "..", "web", "public", "projects", "uploads");
const PUBLIC_PATH_PREFIX = "/projects/uploads";
const R2_KEY_PREFIX = "projects/uploads";

const fileSystemImageStorage: ImageStorage = {
    async upload(fileName, buffer) {
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
        return { src: `${PUBLIC_PATH_PREFIX}/${fileName}` };
    },
    async delete(src) {
        if (!src.startsWith(`${PUBLIC_PATH_PREFIX}/`)) return;
        const fileName = src.slice(PUBLIC_PATH_PREFIX.length + 1);
        await deleteFile(path.join(UPLOAD_DIR, fileName));
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
