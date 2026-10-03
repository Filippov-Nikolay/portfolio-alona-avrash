import { z } from "zod";
import { localized } from "./localized";

export const FooterLegalLinkRawSchema = z.object({
    id: z.string().min(1),
    href: z.string().min(1),
});
export type FooterLegalLinkRaw = z.infer<typeof FooterLegalLinkRawSchema>;

export const FooterI18nSchema = z.object({
    tagline: z.string(),
    legalLinkLabels: z.record(z.string(), z.string()),
});
export type FooterI18n = z.infer<typeof FooterI18nSchema>;

export const FooterContentRawSchema = z.object({
    brandMark: z.string(),
    legalLinks: z.array(FooterLegalLinkRawSchema),
    i18n: localized(FooterI18nSchema),
});
export type FooterContentRaw = z.infer<typeof FooterContentRawSchema>;

export interface FooterLegalLink extends FooterLegalLinkRaw {
    label: string;
}

export interface FooterContent {
    tagline: string;
    brandMark: string;
    legalLinks: FooterLegalLink[];
}
