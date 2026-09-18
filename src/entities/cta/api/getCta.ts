import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { CtaContent, CtaContentRaw } from "../model/cta";

export async function getCta(locale: string): Promise<CtaContent> {
    const { i18n } = await fetchContent<CtaContentRaw>("cta", "cta");
    return resolveLocaleContent(i18n, locale);
}
