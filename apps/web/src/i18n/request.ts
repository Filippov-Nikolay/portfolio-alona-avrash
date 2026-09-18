import { getRequestConfig } from "next-intl/server";
import { isLocale, DEFAULT_LOCALE } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || !isLocale(locale)) {
        locale = DEFAULT_LOCALE;
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
