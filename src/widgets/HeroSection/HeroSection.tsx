import { getHero } from "@/entities/hero/api/getHero";
import { getSocials } from "@/entities/social/api/getSocials";
import type { StatItem } from "@/entities/stat/model/stat";
import type { SelectedWorkSectionProps } from "@/widgets/SelectedWorkSection/SelectedWorkSection";
import { HeroSectionClient } from "./HeroSectionClient";

interface HeroSectionProps {
    locale: string;
    stats: StatItem[];
    selectedWork?: SelectedWorkSectionProps;
}

export async function HeroSection({ locale, stats, selectedWork }: HeroSectionProps) {
    const [hero, socials] = await Promise.all([getHero(locale), getSocials()]);

    return (
        <HeroSectionClient
            hero={hero}
            socials={socials}
            stats={stats}
            selectedWork={selectedWork}
        />
    );
}
