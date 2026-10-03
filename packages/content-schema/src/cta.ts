import { z } from "zod";
import { localized } from "./localized";

export const CtaI18nSchema = z.object({
    heading: z.string(),
    availability: z.string(),
    buttonLabel: z.string(),
});
export type CtaI18n = z.infer<typeof CtaI18nSchema>;

export const CtaContentRawSchema = z.object({
    i18n: localized(CtaI18nSchema),
});
export type CtaContentRaw = z.infer<typeof CtaContentRawSchema>;

export type CtaContent = CtaI18n;
