export const MAX_PROJECT_IMAGE_BYTES = 4 * 1024 * 1024;

export const PROJECT_IMAGE_FORMATS = ["jpeg", "png", "gif", "webp", "avif"] as const;

export const PROJECT_IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/avif";

export const PROJECT_IMAGE_TOO_LARGE = "Image is too large (max 4 MB).";

export function projectImageSizeError(bytes: number): string | null {
    return bytes > MAX_PROJECT_IMAGE_BYTES ? PROJECT_IMAGE_TOO_LARGE : null;
}
