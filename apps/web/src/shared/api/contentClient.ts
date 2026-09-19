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

const DEFAULT_REVALIDATE_SECONDS = 60;

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

// `schema` is optional and, today, only ever passed for the resources admin
// can actually write to R2 (projects, categories, tool-badges) - those are
// the only ones a malformed remote fetch could plausibly return wrong data
// for. The rest still just cast, same as before, since they only ever come
// from the bundled, TS-checked-at-the-call-site content-data package.
export async function fetchContent<T>(path: string, tag: string, schema?: ZodType<T>): Promise<T> {
    const content = await resolveContent<T>(path, tag);
    return schema ? schema.parse(content) : content;
}
