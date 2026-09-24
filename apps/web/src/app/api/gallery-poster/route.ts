import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const CACHE_TTL = 60 * 60 * 1000;
const posters = new Map<string, { expires: number; data: Promise<Buffer> }>();
let active = 0;
const waiting: (() => void)[] = [];

async function createPoster(location: ReturnType<typeof assetLocation>) {
    if (active >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
        return await sharp(await readAsset(location), {
            page: 0,
            pages: 1,
            limitInputPixels: 32_000_000,
        })
            .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82, effort: 3 })
            .timeout({ seconds: 8 })
            .toBuffer();
    } finally {
        const next = waiting.shift();
        if (next) next();
        else active--;
    }
}

function assetLocation(src: string) {
    if (src.length > 2048 || src.includes("\\") || src.includes("\0"))
        throw new Error("Invalid asset");
    const cdn = process.env.CONTENT_CDN_URL ? new URL(process.env.CONTENT_CDN_URL) : null;
    const local = src.startsWith("/") && !src.startsWith("//");
    const url = new URL(src, "https://local.invalid");
    const pathname = decodeURIComponent(url.pathname);
    if (
        (!local && (!cdn || url.origin !== cdn.origin)) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !/^\/(projects|uploads)\/.+\.gif$/i.test(pathname) ||
        pathname.includes("\\") ||
        pathname.includes("\0") ||
        pathname.split("/").some((part) => part === "." || part === "..")
    )
        throw new Error("Invalid asset");
    if (cdn) return { remote: new URL(url.pathname, cdn).href };
    const root = path.resolve(process.cwd(), "public");
    const file = path.resolve(root, `.${pathname}`);
    if (path.relative(root, file).startsWith("..")) throw new Error("Invalid asset");
    return { file };
}

async function readAsset(location: ReturnType<typeof assetLocation>) {
    if (location.file) {
        if ((await stat(location.file)).size > MAX_BYTES) throw new Error("Image too large");
        return readFile(location.file);
    }
    const response = await fetch(location.remote!, {
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.body) throw new Error("Image unavailable");
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
        await response.body.cancel();
        throw new Error("Image too large");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) throw new Error("Image too large");
            chunks.push(value);
        }
    } finally {
        await reader.cancel();
    }
    return Buffer.concat(chunks);
}

export async function GET(request: Request) {
    let location: ReturnType<typeof assetLocation>;
    try {
        location = assetLocation(new URL(request.url).searchParams.get("src") ?? "");
    } catch {
        return new Response("Invalid gallery image", { status: 400 });
    }
    const key = location.remote ?? location.file!;
    let cached = posters.get(key);
    if (!cached || cached.expires < Date.now()) {
        if (waiting.length >= 8)
            return new Response("Preview queue busy", {
                status: 503,
                headers: { "Retry-After": "1" },
            });
        if (posters.size >= 32) posters.delete(posters.keys().next().value!);
        const data = createPoster(location);
        cached = { data, expires: Date.now() + CACHE_TTL };
        posters.set(key, cached);
    }
    try {
        return new Response(new Uint8Array(await cached.data), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control":
                    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
            },
        });
    } catch {
        if (posters.get(key) === cached) posters.delete(key);
        return new Response("Gallery preview unavailable", { status: 404 });
    }
}
