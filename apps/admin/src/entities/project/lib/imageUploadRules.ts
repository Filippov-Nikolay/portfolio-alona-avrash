export const MAX_PROJECT_IMAGE_BYTES = 4 * 1024 * 1024;

export const MAX_DIRECT_UPLOAD_BYTES = 50 * 1024 * 1024;

export const PROJECT_IMAGE_FORMATS = ["jpeg", "png", "gif", "webp", "avif"] as const;

export const PROJECT_IMAGE_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
] as const;

export const PROJECT_IMAGE_ACCEPT = PROJECT_IMAGE_CONTENT_TYPES.join(",");

export const UNSUPPORTED_PROJECT_IMAGE = "Upload a JPEG, PNG, GIF, WebP or AVIF image.";

export function projectImageSizeError(
    bytes: number,
    maxBytes: number = MAX_PROJECT_IMAGE_BYTES
): string | null {
    return bytes > maxBytes
        ? `Image is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`
        : null;
}

export interface UploadedProjectImage {
    src: string;
    posterSrc?: string;
}

export type ProjectImageUploadResult =
    { ok: true; image: UploadedProjectImage } | { ok: false; error: string };
