import { defineRouting } from "next-intl/routing";
import { LOCALES, DEFAULT_LOCALE } from "./locales";

export const routing = defineRouting({
    locales: LOCALES.map((l) => l.code),
    defaultLocale: DEFAULT_LOCALE,
});

export type { Locale } from "./locales";
