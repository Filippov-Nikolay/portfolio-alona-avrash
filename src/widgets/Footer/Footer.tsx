import { getFooter } from "@/entities/footer/api/getFooter";
import { getSocials } from "@/entities/social/api/getSocials";
import { FooterClient } from "./FooterClient";

export async function Footer() {
    const [footer, socials] = await Promise.all([getFooter(), getSocials()]);

    return <FooterClient footer={footer} socials={socials} />;
}
