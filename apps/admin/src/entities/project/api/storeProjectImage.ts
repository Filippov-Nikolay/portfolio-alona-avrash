import path from "node:path";
import { createGifPoster, gifPosterFileName } from "@/shared/lib/gifPoster";
import { detectImage, MAX_INPUT_PIXELS } from "@/shared/lib/imageFormat";
import { getImageStorage } from "@/shared/storage/imageStorage";
import {
    PROJECT_IMAGE_FORMATS,
    UNSUPPORTED_PROJECT_IMAGE,
    type ProjectImageUploadResult,
} from "../lib/imageUploadRules";

const ALLOWED_FORMATS: ReadonlySet<string> = new Set(PROJECT_IMAGE_FORMATS);

export class UploadRejectedError extends Error {}

function sanitizeBaseName(name: string): string {
    const cleaned = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "image";
}

export async function storeProjectImage(
    buffer: Buffer,
    originalName: string
): Promise<ProjectImageUploadResult> {
    const image = await detectImage(buffer);
    if (!image || !ALLOWED_FORMATS.has(image.format)) {
        throw new UploadRejectedError(UNSUPPORTED_PROJECT_IMAGE);
    }
    if (image.width * image.height > MAX_INPUT_PIXELS) {
        throw new UploadRejectedError("Image dimensions are too large (max 100 megapixels).");
    }

    const base = sanitizeBaseName(path.basename(originalName, path.extname(originalName)));
    const fileName = `${Date.now()}-${base}${image.extension}`;
    const storage = getImageStorage();

    if (image.format !== "gif") {
        return { ok: true, image: await storage.upload(fileName, buffer, image.contentType) };
    }

    let poster: Buffer;
    try {
        poster = await createGifPoster(buffer);
    } catch {
        throw new UploadRejectedError("This GIF could not be read. Export it again and retry.");
    }
    const gif = await storage.upload(fileName, buffer, image.contentType);
    try {
        const { src: posterSrc } = await storage.upload(
            gifPosterFileName(fileName),
            poster,
            "image/webp"
        );
        return { ok: true, image: { src: gif.src, posterSrc } };
    } catch (error) {
        await storage.delete(gif.src).catch(() => {});
        throw error;
    }
}

export async function toUploadResult(
    run: () => Promise<ProjectImageUploadResult>
): Promise<ProjectImageUploadResult> {
    try {
        return await run();
    } catch (error) {
        if (error instanceof UploadRejectedError) return { ok: false, error: error.message };
        console.error("[upload] Project image upload failed", error);
        return { ok: false, error: "Upload failed. Try again." };
    }
}
