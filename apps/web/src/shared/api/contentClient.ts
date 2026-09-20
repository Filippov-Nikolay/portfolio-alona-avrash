import type { ZodType } from "zod";
import { getContentResource } from "./contentStore";

const RESOURCE_FILE_NAMES: Record<string, string> = {
    hero: "hero.json",
    cta: "cta.json",
    footer: "footer.json",
    socials: "social.json",
    projects: "projects.json",
    "home-project-gallery": "home-project-gallery.json",
    services: "services.json",
    reviews: "reviews.json",
    stats: "stats.json",
    clients: "clients.json",
    tools: "tools.json",
    categories: "categories.json",
    "tool-badges": "tool-badges.json",
};

export const CONTENT_RESOURCE_TAGS = new Set(Object.keys(RESOURCE_FILE_NAMES));

// Remote JSON changes only through the admin, which invalidates the matching
// tag immediately. The fallback TTL mainly covers deployments where that
// webhook is not configured, so a full day avoids needless R2 reads without
// making content permanently stale.
const DEFAULT_REVALIDATE_SECONDS = 24 * 60 * 60;

function isRemoteSource(): boolean {
    return process.env.CONTENT_SOURCE === "remote";
}

function revalidateSeconds(): number {
    const parsed = Number(process.env.CONTENT_REVALIDATE_SECONDS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVALIDATE_SECONDS;
}

async function fetchRemoteContent<T>(path: string, tag: string): Promise<T | undefined> {
    const cdnUrl = process.env.CONTENT_CDN_URL;
    const fileName = RESOURCE_FILE_NAMES[path];
    if (!cdnUrl || !fileName) return undefined;

    try {
        const response = await fetch(`${cdnUrl.replace(/\/$/, "")}/content/${fileName}`, {
            next: { tags: [tag], revalidate: revalidateSeconds() },
        });
        if (!response.ok) {
            console.error(
                `[content] remote fetch for "${path}" returned ${response.status}, falling back to bundled content`
            );
            return undefined;
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error(
            `[content] remote fetch for "${path}" failed, falling back to bundled content`,
            error
        );
        return undefined;
    }
}

async function resolveContent<T>(path: string, tag: string): Promise<T> {
    if (isRemoteSource()) {
        const remote = await fetchRemoteContent<T>(path, tag);
        if (remote !== undefined) return remote;
    }

    const local = getContentResource(path);
    if (local !== undefined) return local as T;

    const apiUrl = process.env.CONTENT_API_URL;
    if (!apiUrl) {
        throw new Error(
            `No content for "${path}" - CONTENT_SOURCE=remote fetch failed (or is unset), no local ` +
                `bundled copy exists, and CONTENT_API_URL is not set - see .env.example.`
        );
    }

    const response = await fetch(`${apiUrl}/${path}`, {
        next: { tags: [tag] },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}`);
    }

    return response.json();
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

// `schema` is optional and, today, only ever passed for the resources admin
// can actually write to R2 (projects, categories, tool-badges) - those are
// the only ones a malformed remote fetch could plausibly return wrong data
// for. The rest still just cast, same as before, since they only ever come
// from the bundled, TS-checked-at-the-call-site content-data package.
export async function fetchContent<T>(path: string, tag: string, schema?: ZodType<T>): Promise<T> {
    const content = await resolveContent<T>(path, tag);
    const parsed = schema ? schema.parse(content) : content;
    return resolveCdnAssetUrls(parsed);
}
