import type { MetadataRoute } from "next";
import { siteConfig } from "@/shared/config/site.config";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";

const BASE = siteConfig.url;
const LAST_MODIFIED = new Date();

const ROUTES: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1 },
    { path: "/works", priority: 0.8 },
    { path: "/contact", priority: 0.8 },
    { path: "/legal", priority: 0.3 },
    { path: "/legal/privacy", priority: 0.3 },
    { path: "/legal/cookies", priority: 0.3 },
    { path: "/legal/privacy-preferences", priority: 0.3 },
    { path: "/legal/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
    return LOCALES.flatMap(({ code }) =>
        ROUTES.map(({ path, priority }) => ({
            url: `${BASE}/${code}${path}`,
            lastModified: LAST_MODIFIED,
            changeFrequency: "monthly" as const,
            priority: code === DEFAULT_LOCALE ? priority : priority * 0.9,
        }))
    );
}
