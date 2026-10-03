import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/shared/config/site.config";
import { Container, LegalDocument } from "@/shared/ui";
import { ManagePreferencesButton } from "@/features/privacy-preferences";
import {
    PRIVACY_PREFERENCES_LAST_UPDATED,
    PRIVACY_PREFERENCES_MARKDOWN,
} from "@/content/legal/privacyPreferences";
import styles from "../legalCallout.module.scss";

interface LegalPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "legal.privacyPreferences" });
    const canonical = `${siteConfig.url}/${locale}/legal/privacy-preferences`;

    return {
        title: t("title"),
        description: t("description"),
        alternates: { canonical },
    };
}

export default async function PrivacyPreferencesNoticePage({ params }: LegalPageProps) {
    setRequestLocale((await params).locale);
    const [t, tLegal] = await Promise.all([
        getTranslations("legal.privacyPreferences"),
        getTranslations("legal"),
    ]);

    return (
        <main>
            <Container>
                <LegalDocument
                    legalLabel={tLegal("index.title")}
                    title={t("title")}
                    lastUpdatedLabel={tLegal("lastUpdated")}
                    lastUpdated={PRIVACY_PREFERENCES_LAST_UPDATED}
                    tocLabel={tLegal("tableOfContents")}
                    markdown={PRIVACY_PREFERENCES_MARKDOWN}
                    selfSlug="privacy-preferences"
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
