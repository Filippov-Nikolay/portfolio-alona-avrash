"use server";

import path from "node:path";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { createGifPoster, gifPosterFileName } from "@/shared/lib/gifPoster";
import { detectImage, MAX_INPUT_PIXELS } from "@/shared/lib/imageFormat";
import { getImageStorage } from "@/shared/storage/imageStorage";
import { PROJECT_IMAGE_FORMATS, projectImageSizeError } from "../lib/imageUploadRules";

const ALLOWED_FORMATS: ReadonlySet<string> = new Set(PROJECT_IMAGE_FORMATS);

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

    const sizeError = projectImageSizeError(file.size);
    if (sizeError) throw new Error(sizeError);

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await detectImage(buffer);
    if (!image || !ALLOWED_FORMATS.has(image.format)) {
        throw new Error("Upload a JPEG, PNG, GIF, WebP or AVIF image.");
    }
    if (image.width * image.height > MAX_INPUT_PIXELS) {
        throw new Error("Image dimensions are too large (max 100 megapixels).");
    }

    const base = sanitizeBaseName(path.basename(file.name, path.extname(file.name)));
    const fileName = `${Date.now()}-${base}${image.extension}`;
    const storage = getImageStorage();

    if (image.format !== "gif") {
        return storage.upload(fileName, buffer, image.contentType);
    }

    let poster: Buffer;
    try {
        poster = await createGifPoster(buffer);
    } catch {
        throw new Error("This GIF could not be read. Export it again and retry.");
    }
    const gif = await storage.upload(fileName, buffer, image.contentType);
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
