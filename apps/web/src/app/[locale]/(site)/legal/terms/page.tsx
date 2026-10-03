import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/shared/config/site.config";
import { Container, LegalDocument } from "@/shared/ui";
import { TERMS_LAST_UPDATED, TERMS_MARKDOWN } from "@/content/legal/terms";

interface LegalPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "legal.terms" });
    const canonical = `${siteConfig.url}/${locale}/legal/terms`;

    return {
        title: t("title"),
        description: t("description"),
        alternates: { canonical },
    };
}

export default async function TermsOfUsePage({ params }: LegalPageProps) {
    setRequestLocale((await params).locale);
    const [t, tLegal] = await Promise.all([
        getTranslations("legal.terms"),
        getTranslations("legal"),
    ]);

    return (
        <main>
            <Container>
                <LegalDocument
                    legalLabel={tLegal("index.title")}
                    title={t("title")}
                    lastUpdatedLabel={tLegal("lastUpdated")}
                    lastUpdated={TERMS_LAST_UPDATED}
                    tocLabel={tLegal("tableOfContents")}
                    markdown={TERMS_MARKDOWN}
                    selfSlug="terms"
                />
            </Container>
        </main>
    );
}
