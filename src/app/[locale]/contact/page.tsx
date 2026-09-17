import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSocials } from "@/entities/social/api/getSocials";
import { ContactSection } from "@/widgets/ContactSection";

interface ContactPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "nav" });

    return { title: t("contact") };
}

export default async function ContactPage() {
    const socials = await getSocials();

    return (
        <main>
            <ContactSection socials={socials} />
        </main>
    );
}
