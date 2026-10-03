import { z } from "zod";
import { DEFAULT_SITE_LOCALE } from "./locale";

export function localized<T extends z.ZodType>(entry: T) {
    return z
        .record(z.string(), entry)
        .refine((translations) => DEFAULT_SITE_LOCALE in translations, {
            message: `Missing the "${DEFAULT_SITE_LOCALE}" translation`,
        });
}
