import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactSection } from "@/widgets/ContactSection";

interface ContactPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "nav" });

    return { title: t("contact") };
}

export default function ContactPage() {
    return (
        <main>
            <ContactSection />
        </main>
    );
}
