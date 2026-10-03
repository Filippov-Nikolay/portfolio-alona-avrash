import { siteConfig } from "@/shared/config/site.config";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import packageJson from "../../../package.json";

const OG_COVER = {
    width: 1200,
    height: 630,
    alt: siteConfig.name,
};

export const DEFAULT_OG_IMAGES = [
    { ...OG_COVER, url: `/og/cover.jpg?v=${packageJson.version}`, type: "image/jpeg" },
    { ...OG_COVER, url: `/og/cover.webp?v=${packageJson.version}`, type: "image/webp" },
];

export function buildPageAlternates(locale: string, path = "") {
    const canonical = `${siteConfig.url}/${locale}${path}`;
    const languages = Object.fromEntries([
        ...LOCALES.map(({ code }) => [code, `${siteConfig.url}/${code}${path}`]),
        ["x-default", `${siteConfig.url}/${DEFAULT_LOCALE}${path}`],
    ]);

    return { canonical, languages };
}

export function isIndexable(): boolean {
    const environment = process.env.VERCEL_ENV;
    return !environment || environment === "production";
}

export function robotsDirectives() {
    const indexable = isIndexable();
    return { index: indexable, follow: indexable };
}

function toListItem(label: string, locale: string): string {
    return /\p{Lu}{2}/u.test(label) ? label : label.toLocaleLowerCase(locale);
}

export function formatCategoryList(labels: string[], locale: string): string {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(
        labels.map((label) => toListItem(label, locale))
    );
}
