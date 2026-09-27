"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/ui";
import { useMounted } from "@/shared/hooks";
import { usePrivacyPreferences } from "../model/PrivacyPreferencesProvider";
import styles from "./ConsentBanner.module.scss";

export function ConsentBanner() {
    const t = useTranslations("privacyPreferences");
    const mounted = useMounted();
    const { isBannerVisible, acceptOptional, rejectOptional, openPanel } = usePrivacyPreferences();

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isBannerVisible && (
                <m.div
                    className={styles.banner}
                    role="region"
                    aria-label={t("panelTitle")}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <p className={styles.text}>
                        {t.rich("bannerText", {
                            cookies: (chunks) => (
                                <Link href="/legal/cookies" className={styles.link}>
                                    {chunks}
                                </Link>
                            ),
                        })}
                    </p>
                    <div className={styles.actions}>
                        <button type="button" className={styles.manageButton} onClick={openPanel}>
                            {t("managePreferences")}
                        </button>
                        <button
                            type="button"
                            className={styles.rejectButton}
                            onClick={rejectOptional}
                        >
                            {t("rejectOptional")}
                        </button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={acceptOptional}
                            className={styles.acceptButton}
                        >
                            {t("acceptOptional")}
                        </Button>
                    </div>
                </m.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

ConsentBanner.displayName = "ConsentBanner";
