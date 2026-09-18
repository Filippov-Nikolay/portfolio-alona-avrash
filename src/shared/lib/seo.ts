import { siteConfig } from "@/shared/config/site.config";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";

export function buildPageAlternates(locale: string, path = "") {
    const canonical = `${siteConfig.url}/${locale}${path}`;
    const languages = Object.fromEntries([
        ...LOCALES.map(({ code }) => [code, `${siteConfig.url}/${code}${path}`]),
        ["x-default", `${siteConfig.url}/${DEFAULT_LOCALE}${path}`],
    ]);

    return { canonical, languages };
}
