import { fetchContent } from "@/shared/api/contentClient";
import type { HeroContent } from "../model/hero";

export function getHero(): Promise<HeroContent> {
    return fetchContent<HeroContent>("hero", "hero");
}
