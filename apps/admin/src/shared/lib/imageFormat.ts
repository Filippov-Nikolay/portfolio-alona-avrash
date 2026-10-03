import sharp, { type Metadata } from "sharp";

export const MAX_INPUT_PIXELS = 100_000_000;

const FORMATS = {
    jpeg: { extension: ".jpg", contentType: "image/jpeg" },
    png: { extension: ".png", contentType: "image/png" },
    gif: { extension: ".gif", contentType: "image/gif" },
    webp: { extension: ".webp", contentType: "image/webp" },
    avif: { extension: ".avif", contentType: "image/avif" },
    svg: { extension: ".svg", contentType: "image/svg+xml" },
} as const;

export type ImageFormat = keyof typeof FORMATS;

export interface DetectedImage {
    format: ImageFormat;
    extension: string;
    contentType: string;
    width: number;
    height: number;
}

function toImageFormat(metadata: Metadata): ImageFormat | null {
    if (metadata.format === "heif") return metadata.compression === "av1" ? "avif" : null;
    return metadata.format in FORMATS ? (metadata.format as ImageFormat) : null;
}

export async function detectImage(bytes: Buffer): Promise<DetectedImage | null> {
    let metadata: Metadata;
    try {
        metadata = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
        return null;
    }

    const format = toImageFormat(metadata);
    if (!format || !metadata.width || !metadata.height) return null;

    return {
        format,
        ...FORMATS[format],
        width: metadata.width,
        height: metadata.height,
    };
}
