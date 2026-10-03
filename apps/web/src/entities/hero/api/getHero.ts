import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { HeroContent } from "@avrash/content-schema";

export async function getHero(locale: string): Promise<HeroContent> {
    const { i18n, ...rest } = await fetchContent("hero");
    return { ...rest, ...resolveLocaleContent(i18n, locale) };
}
