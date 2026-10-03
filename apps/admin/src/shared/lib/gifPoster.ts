import sharp from "sharp";

const GIF_EXTENSION = /\.gif$/i;
const POSTER_MAX_WIDTH = 2560;

export function isGifFileName(fileName: string): boolean {
    return GIF_EXTENSION.test(fileName);
}

export function gifPosterFileName(gifFileName: string): string {
    return gifFileName.replace(GIF_EXTENSION, "-poster.webp");
}

export async function createGifPoster(gif: Buffer): Promise<Buffer> {
    return sharp(gif, { pages: 1, limitInputPixels: 100_000_000 })
        .resize({ width: POSTER_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
}
