import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { HeroContent, HeroContentRaw } from "@avrash/content-schema";

export async function getHero(locale: string): Promise<HeroContent> {
    const { i18n, ...rest } = await fetchContent<HeroContentRaw>("hero", "hero");
    return { ...rest, ...resolveLocaleContent(i18n, locale) };
}
