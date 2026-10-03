"use server";

import path from "node:path";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { createGifPoster, gifPosterFileName, isGifFileName } from "@/shared/lib/gifPoster";
import { getImageStorage } from "@/shared/storage/imageStorage";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);
const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeBaseName(name: string): string {
    const cleaned = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "image";
}

export interface UploadedProjectImage {
    src: string;
    posterSrc?: string;
}

export async function uploadProjectImageAction(file: File): Promise<UploadedProjectImage> {
    await requireAdminSession();

    if (!file.type.startsWith("image/")) {
        throw new Error("Only image files can be uploaded.");
    }
    if (file.size > MAX_BYTES) {
        throw new Error("Image is too large (max 10MB).");
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported file type "${ext || "unknown"}".`);
    }

    const base = sanitizeBaseName(path.basename(file.name, ext));
    const fileName = `${Date.now()}-${base}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getImageStorage();

    if (!isGifFileName(fileName)) {
        return storage.upload(fileName, buffer, file.type);
    }

    let poster: Buffer;
    try {
        poster = await createGifPoster(buffer);
    } catch {
        throw new Error("This GIF could not be read. Export it again and retry.");
    }
    const gif = await storage.upload(fileName, buffer, file.type);
    try {
        const { src: posterSrc } = await storage.upload(
            gifPosterFileName(fileName),
            poster,
            "image/webp"
        );
        return { src: gif.src, posterSrc };
    } catch (error) {
        await storage.delete(gif.src).catch(() => {});
        throw error;
    }
}
