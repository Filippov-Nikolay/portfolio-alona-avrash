import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSocials } from "@/entities/social/api/getSocials";
import { ContactSection } from "@/widgets/ContactSection";
import { siteConfig } from "@/shared/config/site.config";
import { getLocaleMeta } from "@/i18n/locales";
import { DEFAULT_OG_IMAGES, buildPageAlternates } from "@/shared/lib/seo";

interface ContactPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
    const { locale } = await params;
    const [t, tSeo] = await Promise.all([
        getTranslations({ locale, namespace: "nav" }),
        getTranslations({ locale, namespace: "seo" }),
    ]);
    const { ogLocale } = getLocaleMeta(locale);
    const { canonical, languages } = buildPageAlternates(locale, "/contact");
    const title = t("contact");
    const ogTitle = `${title} | ${siteConfig.name}`;

    return {
        title,
        alternates: { canonical, languages },
        openGraph: {
            title: ogTitle,
            description: tSeo("description"),
            url: canonical,
            siteName: siteConfig.name,
            type: "website",
            locale: ogLocale,
            images: DEFAULT_OG_IMAGES,
        },
    };
}

export default async function ContactPage() {
    const socials = await getSocials();

    return (
        <main>
            <ContactSection socials={socials} />
        </main>
    );
}
