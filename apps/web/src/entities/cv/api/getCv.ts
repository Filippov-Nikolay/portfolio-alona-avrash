import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import {
    CvContentSchema,
    resolveCv,
    type CvContent,
    type ResolvedCv,
} from "@avrash/content-schema";

let refreshing: { url: string; promise: Promise<CvContent> } | null = null;

async function readRemoteCv(url: string, fresh: boolean): Promise<CvContent> {
    const response = await fetch(url, {
        ...(fresh ? { cache: "no-store" as const } : { next: { tags: ["cv"], revalidate: 30 } }),
        headers: { "Cache-Control": "no-cache" },
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return { files: {} };
    if (!response.ok) throw new Error(`CV metadata request failed (${response.status}).`);
    return CvContentSchema.parse(await response.json());
}

async function remoteCv(fresh: boolean): Promise<CvContent> {
    const base = process.env.CONTENT_CDN_URL;
    if (!base) throw new Error("CONTENT_CDN_URL is not configured.");
    const url = `${base.replace(/\/$/, "")}/content/cv.json`;
    if (!fresh) return readRemoteCv(url, false);
    if (refreshing?.url === url) return refreshing.promise;
    const pending = { url, promise: readRemoteCv(url, true) };
    refreshing = pending;
    try {
        return await pending.promise;
    } finally {
        if (refreshing === pending) refreshing = null;
    }
}

export function cvContentDirectory(): string {
    return (
        process.env.CONTENT_DATA_DIR ??
        path.join(process.cwd(), "..", "..", "packages", "content-data", "src")
    );
}

const getCvContent = cache(async (fresh: boolean): Promise<CvContent> => {
    try {
        if (process.env.CONTENT_SOURCE === "remote") {
            return await remoteCv(fresh);
        }
        // Read the shared file at request time: a bundled JSON import would
        // require a new production build each time the admin replaced the CV.
        const raw = await readFile(path.join(cvContentDirectory(), "cv.json"), "utf-8");
        return CvContentSchema.parse(JSON.parse(raw));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("[cv] Could not read CV metadata", error);
        }
        return { files: {} };
    }
});

export async function getCv(
    locale: string,
    { fresh = false }: { fresh?: boolean } = {}
): Promise<ResolvedCv | null> {
    return resolveCv(await getCvContent(fresh), locale);
}
