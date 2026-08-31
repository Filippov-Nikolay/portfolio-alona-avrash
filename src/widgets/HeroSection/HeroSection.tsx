import { getHero } from "@/entities/hero/api/getHero";
import { getSocials } from "@/entities/social/api/getSocials";
import { HeroSectionClient } from "./HeroSectionClient";

export async function HeroSection() {
    const [hero, socials] = await Promise.all([getHero(), getSocials()]);

    return <HeroSectionClient hero={hero} socials={socials} />;
}
