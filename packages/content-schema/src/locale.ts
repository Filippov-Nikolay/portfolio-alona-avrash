export const SITE_LOCALES = [
    { code: "en", label: "EN", name: "English", ogLocale: "en_US" },
    { code: "pl", label: "PL", name: "Polish", ogLocale: "pl_PL" },
] as const;

export const DEFAULT_SITE_LOCALE = "en" satisfies (typeof SITE_LOCALES)[number]["code"];

export type SiteLocale = (typeof SITE_LOCALES)[number]["code"];

export function isSiteLocale(value: string): value is SiteLocale {
    return SITE_LOCALES.some((locale) => locale.code === value);
}
