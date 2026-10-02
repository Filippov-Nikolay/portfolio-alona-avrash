import {
    DEFAULT_SITE_LOCALE,
    isSiteLocale,
    SITE_LOCALES,
    type SiteLocale,
} from "@avrash/content-schema/locale";

export const LOCALES = SITE_LOCALES;

export const DEFAULT_LOCALE = DEFAULT_SITE_LOCALE;

export type Locale = SiteLocale;

export const isLocale = isSiteLocale;

export function getLocaleMeta(code: string) {
    return LOCALES.find((l) => l.code === code) ?? LOCALES.find((l) => l.code === DEFAULT_LOCALE)!;
}
