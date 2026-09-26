import { siteConfig } from "@/shared/config/site.config";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import packageJson from "../../../package.json";

export const DEFAULT_OG_IMAGE = {
    url: `/og/cover.png?v=${packageJson.version}`,
    width: 1200,
    height: 630,
    type: "image/png",
    alt: siteConfig.name,
};

export function buildPageAlternates(locale: string, path = "") {
    const canonical = `${siteConfig.url}/${locale}${path}`;
    const languages = Object.fromEntries([
        ...LOCALES.map(({ code }) => [code, `${siteConfig.url}/${code}${path}`]),
        ["x-default", `${siteConfig.url}/${DEFAULT_LOCALE}${path}`],
    ]);

    return { canonical, languages };
}
