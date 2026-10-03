import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/shared/config/site.config";
import { ArrowIcon, Container } from "@/shared/ui";
import { LEGAL_ROUTES, type LegalDocSlug } from "@/content/legal/legalLinks";
import { COOKIE_POLICY_LAST_UPDATED } from "@/content/legal/cookies";
import { PRIVACY_POLICY_LAST_UPDATED } from "@/content/legal/privacy";
import { PRIVACY_PREFERENCES_LAST_UPDATED } from "@/content/legal/privacyPreferences";
import { TERMS_LAST_UPDATED } from "@/content/legal/terms";
import styles from "./page.module.scss";

interface LegalIndexPageProps {
    params: Promise<{ locale: string }>;
}

const DOCUMENTS: { slug: LegalDocSlug; messageKey: string; lastUpdated: string }[] = [
    { slug: "privacy", messageKey: "privacy", lastUpdated: PRIVACY_POLICY_LAST_UPDATED },
    { slug: "cookies", messageKey: "cookies", lastUpdated: COOKIE_POLICY_LAST_UPDATED },
    {
        slug: "privacy-preferences",
        messageKey: "privacyPreferences",
        lastUpdated: PRIVACY_PREFERENCES_LAST_UPDATED,
    },
    { slug: "terms", messageKey: "terms", lastUpdated: TERMS_LAST_UPDATED },
];

export async function generateMetadata({ params }: LegalIndexPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "legal.index" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: { canonical: `${siteConfig.url}/${locale}/legal` },
    };
}

export default async function LegalIndexPage({ params }: LegalIndexPageProps) {
    setRequestLocale((await params).locale);
    const t = await getTranslations("legal");

    return (
        <main>
            <Container>
                <div className={styles.wrapper}>
                    <header className={styles.header}>
                        <h1 className={styles.title}>{t("index.title")}</h1>
                        <p className={styles.intro}>{t("index.intro")}</p>
                    </header>

                    <ul className={styles.list}>
                        {DOCUMENTS.map(({ slug, messageKey, lastUpdated }) => (
                            <li key={slug}>
                                <Link href={LEGAL_ROUTES[slug]} className={styles.card}>
                                    <h2 className={styles.cardTitle}>{t(`${messageKey}.title`)}</h2>
                                    <p className={styles.cardDescription}>
                                        {t(`${messageKey}.description`)}
                                    </p>
                                    <span className={styles.cardFooter}>
                                        <span className={styles.cardMeta}>
                                            {t("lastUpdated")} {lastUpdated}
                                        </span>
                                        <span className={styles.cardAction}>
                                            {t("index.open")}
                                            <ArrowIcon
                                                className={styles.cardArrow}
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </Container>
        </main>
    );
}
