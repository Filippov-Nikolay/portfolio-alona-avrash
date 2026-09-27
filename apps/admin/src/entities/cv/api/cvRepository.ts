import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CvContentSchema, cvFileKey, type CvDocument } from "@avrash/content-schema";
import { contentDataDir } from "@/shared/storage/contentDir";
import { getStorageDriver } from "@/shared/storage/driver";
import { deleteFile, readJsonFile } from "@/shared/storage/fs";
import {
    deleteObject,
    readJsonObject,
    readObject,
    writeJsonObject,
    writeObject,
} from "@/shared/storage/r2";

interface CvStorage {
    read(): Promise<unknown>;
    write(document: CvDocument | null): Promise<void>;
    upload(key: string, bytes: Buffer): Promise<void>;
    download(key: string): Promise<Uint8Array>;
    remove(key: string): Promise<void>;
}

function isMissing(error: unknown): boolean {
    const value = error as {
        code?: string;
        name?: string;
        $metadata?: { httpStatusCode?: number };
    };
    return (
        value.code === "ENOENT" ||
        value.name === "NoSuchKey" ||
        value.$metadata?.httpStatusCode === 404
    );
}

export function createCvRepository(storage: CvStorage) {
    async function get(): Promise<CvDocument | null> {
        try {
            return CvContentSchema.parse(await storage.read());
        } catch (error) {
            if (isMissing(error)) return null;
            throw error;
        }
    }

    async function cleanup(document: CvDocument) {
        try {
            await storage.remove(cvFileKey(document));
        } catch (error) {
            // A cleanup failure must not turn a successful publication into a
            // reported save failure or remove the newly published file.
            console.error("[cv] Could not remove obsolete PDF", error);
        }
    }

    return {
        get,
        download: (document: CvDocument) => storage.download(cvFileKey(document)),
        async save(fileName: string, bytes: Buffer): Promise<CvDocument> {
            const previous = await get();
            const document: CvDocument = {
                id: randomUUID(),
                fileName: fileName.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 180),
                size: bytes.length,
                updatedAt: new Date().toISOString(),
            };
            await storage.upload(cvFileKey(document), bytes);
            try {
                await storage.write(document);
            } catch (error) {
                await cleanup(document);
                throw error;
            }
            if (previous) await cleanup(previous);
            return document;
        },
        async remove(): Promise<void> {
            const previous = await get();
            // Unpublish first, so the website never advertises a deleted file.
            await storage.write(null);
            if (previous) await cleanup(previous);
        },
    };
}

const filesystem: CvStorage = {
    read: () => readJsonFile(path.join(contentDataDir(), "cv.json")),
    async write(document) {
        const dir = contentDataDir();
        await mkdir(dir, { recursive: true });
        const temporary = path.join(dir, `cv.${randomUUID()}.tmp`);
        try {
            await writeFile(temporary, `${JSON.stringify(document, null, 4)}\n`);
            await rename(temporary, path.join(dir, "cv.json"));
        } finally {
            await deleteFile(temporary);
        }
    },
    async upload(key, bytes) {
        const destination = path.join(contentDataDir(), key);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, bytes);
    },
    download: (key) => readFile(path.join(contentDataDir(), key)),
    remove: (key) => deleteFile(path.join(contentDataDir(), key)),
};

const r2: CvStorage = {
    read: () => readJsonObject("content/cv.json"),
    write: (document) => writeJsonObject("content/cv.json", document),
    upload: (key, bytes) => writeObject(key, bytes, "application/pdf"),
    download: readObject,
    remove: deleteObject,
};

export function getCvRepository() {
    return createCvRepository(getStorageDriver() === "r2" ? r2 : filesystem);
}
