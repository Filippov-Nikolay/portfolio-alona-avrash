import { getFooter } from "@/entities/footer/api/getFooter";
import { getSocials } from "@/entities/social/api/getSocials";
import { FooterClient } from "./FooterClient";

interface FooterProps {
    locale: string;
}

export async function Footer({ locale }: FooterProps) {
    const [footer, socials] = await Promise.all([getFooter(locale), getSocials()]);

    return <FooterClient footer={footer} socials={socials} />;
}
