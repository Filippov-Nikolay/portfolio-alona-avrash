import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { FooterContent, FooterContentRaw } from "@avrash/content-schema";

export async function getFooter(locale: string): Promise<FooterContent> {
    const { i18n, legalLinks, ...rest } = await fetchContent<FooterContentRaw>("footer", "footer");
    const { tagline, legalLinkLabels } = resolveLocaleContent(i18n, locale);

    return {
        ...rest,
        tagline,
        legalLinks: legalLinks.map((link) => ({ ...link, label: legalLinkLabels[link.id] })),
    };
}
