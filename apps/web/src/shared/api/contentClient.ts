import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONTENT_RESOURCES, type ContentOf, type ContentResource } from "@avrash/content-schema";
import { z } from "zod";
import { getContentResource } from "./contentStore";

export const CONTENT_RESOURCE_TAGS: ReadonlySet<string> = new Set(Object.keys(CONTENT_RESOURCES));

// Remote JSON changes only through the admin, which invalidates the matching
// tag immediately. The fallback TTL mainly covers deployments where that
// webhook is not configured, so a full day avoids needless R2 reads without
// making content permanently stale.
const DEFAULT_REVALIDATE_SECONDS = 24 * 60 * 60;

type ContentSource = "local" | "remote" | "directory";

function contentSource(): ContentSource {
    const source = process.env.CONTENT_SOURCE;
    return source === "remote" || source === "directory" ? source : "local";
}

function revalidateSeconds(): number {
    const parsed = Number(process.env.CONTENT_REVALIDATE_SECONDS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVALIDATE_SECONDS;
}

function parse<R extends ContentResource>(resource: R, data: unknown): ContentOf<R> {
    return CONTENT_RESOURCES[resource].schema.parse(data) as ContentOf<R>;
}

async function fetchRemoteContent(resource: ContentResource): Promise<unknown> {
    const cdnUrl = process.env.CONTENT_CDN_URL;
    if (!cdnUrl) return undefined;

    try {
        const response = await fetch(
            `${cdnUrl.replace(/\/$/, "")}/content/${CONTENT_RESOURCES[resource].file}`,
            { next: { tags: [resource], revalidate: revalidateSeconds() } }
        );
        if (!response.ok) {
            console.error(
                `[content] remote fetch for "${resource}" returned ${response.status}, falling back to bundled content`
            );
            return undefined;
        }
        return await response.json();
    } catch (error) {
        console.error(
            `[content] remote fetch for "${resource}" failed, falling back to bundled content`,
            error
        );
        return undefined;
    }
}

async function readDirectoryContent(resource: ContentResource): Promise<unknown> {
    const directory = process.env.CONTENT_DIR;
    if (!directory) {
        throw new Error("CONTENT_SOURCE=directory requires CONTENT_DIR - see .env.example.");
    }
    const file = path.join(/*turbopackIgnore: true*/ directory, CONTENT_RESOURCES[resource].file);
    return JSON.parse(await readFile(file, "utf-8"));
}

async function resolveContent<R extends ContentResource>(resource: R): Promise<ContentOf<R>> {
    const source = contentSource();

    if (source === "directory") {
        return parse(resource, await readDirectoryContent(resource));
    }

    if (source === "remote") {
        const remote = await fetchRemoteContent(resource);
        if (remote !== undefined) {
            const result = CONTENT_RESOURCES[resource].schema.safeParse(remote);
            if (result.success) return result.data as ContentOf<R>;
            console.error(
                `[content] remote "${resource}" does not match its schema, falling back to bundled content\n${z.prettifyError(result.error)}`
            );
        }
    }

    return parse(resource, getContentResource(resource));
}

// Content JSON stores every project/gallery image as a root-relative path
// ("/projects/esencha/001.gif"), which is correct when Next.js is serving
// them itself out of apps/web/public - but once CONTENT_CDN_URL points at an
// R2 bucket (CONTENT_SOURCE=remote, or admin's ADMIN_STORAGE_DRIVER=r2 while
// content itself is still local), that path resolves relative to this app's
// own origin instead, not the bucket - a project's hero still "works" only
// because it happens to also ship bundled in this app's own public/, while
// every other gallery image 404s. Rewriting "/projects/..." to an absolute
// CDN URL here, once, means every consumer (WorksCard, ShowcaseModal,
// GalleryLightbox, Hero, Selected Works, ...) gets an already-correct URL
// with no changes of its own - and CONTENT_CDN_URL's host is already allowed
// by next.config.ts's images.remotePatterns/CSP for exactly this reason.
// "/assets/..." paths (tool badge icons, social logos) are untouched - those
// are static files that ship with this app's own deployment, never R2.
export function resolveCdnAssetUrls<T>(value: T): T {
    const cdnUrl = process.env.CONTENT_CDN_URL?.replace(/\/$/, "");
    if (!cdnUrl) return value;

    const resolve = (current: unknown): unknown => {
        if (typeof current === "string" && current.startsWith("/projects/")) {
            return `${cdnUrl}${current}`;
        }
        if (Array.isArray(current)) {
            return current.map(resolve);
        }
        if (current && typeof current === "object") {
            return Object.fromEntries(
                Object.entries(current).map(([key, item]) => [key, resolve(item)])
            );
        }
        return current;
    };

    return resolve(value) as T;
}

export async function fetchContent<R extends ContentResource>(resource: R): Promise<ContentOf<R>> {
    return resolveCdnAssetUrls(await resolveContent(resource));
}
