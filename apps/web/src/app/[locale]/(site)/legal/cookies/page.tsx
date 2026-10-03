import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/shared/config/site.config";
import { Container, LegalDocument } from "@/shared/ui";
import { ManagePreferencesButton } from "@/features/privacy-preferences";
import { COOKIE_POLICY_LAST_UPDATED, COOKIE_POLICY_MARKDOWN } from "@/content/legal/cookies";
import styles from "../legalCallout.module.scss";

interface LegalPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "legal.cookies" });
    const canonical = `${siteConfig.url}/${locale}/legal/cookies`;

    return {
        title: t("title"),
        description: t("description"),
        alternates: { canonical },
    };
}

export default async function CookiePolicyPage({ params }: LegalPageProps) {
    setRequestLocale((await params).locale);
    const [t, tLegal] = await Promise.all([
        getTranslations("legal.cookies"),
        getTranslations("legal"),
    ]);

    return (
        <main>
            <Container>
                <LegalDocument
                    legalLabel={tLegal("index.title")}
                    title={t("title")}
                    lastUpdatedLabel={tLegal("lastUpdated")}
                    lastUpdated={COOKIE_POLICY_LAST_UPDATED}
                    tocLabel={tLegal("tableOfContents")}
                    markdown={COOKIE_POLICY_MARKDOWN}
                    selfSlug="cookies"
                    afterHeader={
                        <div className={styles.callout}>
                            <p className={styles.calloutText}>{t("manageCalloutText")}</p>
                            <ManagePreferencesButton className={styles.calloutButton}>
                                {t("manageCalloutButton")}
                            </ManagePreferencesButton>
                        </div>
                    }
                />
            </Container>
        </main>
    );
}
