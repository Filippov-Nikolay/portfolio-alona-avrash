export const LOCALES = [
    { code: "en", label: "EN", ogLocale: "en_US" },
    { code: "pl", label: "PL", ogLocale: "pl_PL" },
] as const;

export const DEFAULT_LOCALE = "en" satisfies (typeof LOCALES)[number]["code"];

export type Locale = (typeof LOCALES)[number]["code"];

export function isLocale(value: string): value is Locale {
    return LOCALES.some((l) => l.code === value);
}

export function getLocaleMeta(code: string) {
    return LOCALES.find((l) => l.code === code) ?? LOCALES.find((l) => l.code === DEFAULT_LOCALE)!;
}
