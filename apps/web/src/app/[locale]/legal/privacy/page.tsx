import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/shared/config/site.config";
import { Container, LegalDocument } from "@/shared/ui";
import { PRIVACY_POLICY_LAST_UPDATED, PRIVACY_POLICY_MARKDOWN } from "@/content/legal/privacy";

interface LegalPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "legal.privacy" });
    const canonical = `${siteConfig.url}/${locale}/legal/privacy`;

    return {
        title: t("title"),
        description: t("description"),
        alternates: { canonical },
        robots: { index: true, follow: true },
    };
}

export default async function PrivacyPolicyPage() {
    const [t, tLegal] = await Promise.all([
        getTranslations("legal.privacy"),
        getTranslations("legal"),
    ]);

    return (
        <main>
            <Container>
                <LegalDocument
                    homeLabel={tLegal("home")}
                    title={t("title")}
                    lastUpdatedLabel={tLegal("lastUpdated")}
                    lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
                    tocLabel={tLegal("tableOfContents")}
                    markdown={PRIVACY_POLICY_MARKDOWN}
                    selfSlug="privacy"
                />
            </Container>
        </main>
    );
}
