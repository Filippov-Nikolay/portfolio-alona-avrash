import { getHero } from "@/entities/hero/api/getHero";
import { getSocials } from "@/entities/social/api/getSocials";
import type { StatItem } from "@/entities/stat/model/stat";
import { HeroSectionClient } from "./HeroSectionClient";

interface HeroSectionProps {
    stats: StatItem[];
}

export async function HeroSection({ stats }: HeroSectionProps) {
    const [hero, socials] = await Promise.all([getHero(), getSocials()]);

    return <HeroSectionClient hero={hero} socials={socials} stats={stats} />;
}
