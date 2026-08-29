import type { MetadataRoute } from "next";
import { siteConfig } from "@/shared/config/site.config";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";

const BASE = siteConfig.url;
const LAST_MODIFIED = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
    return LOCALES.map(({ code }) => ({
        url: `${BASE}/${code}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: code === DEFAULT_LOCALE ? 1 : 0.9,
    }));
}
