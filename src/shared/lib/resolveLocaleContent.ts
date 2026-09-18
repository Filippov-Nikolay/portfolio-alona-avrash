import { DEFAULT_LOCALE } from "@/i18n/locales";

export function resolveLocaleContent<T>(i18n: Record<string, T>, locale: string): T {
    return i18n[locale] ?? i18n[DEFAULT_LOCALE];
}
