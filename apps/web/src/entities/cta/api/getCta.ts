import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { CtaContent } from "@avrash/content-schema";

export async function getCta(locale: string): Promise<CtaContent> {
    const { i18n } = await fetchContent("cta");
    return resolveLocaleContent(i18n, locale);
}
