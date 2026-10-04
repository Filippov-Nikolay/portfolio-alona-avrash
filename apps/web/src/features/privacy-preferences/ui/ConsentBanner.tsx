"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { useHeroIntroComplete } from "@/shared/lib/heroIntro";
import { Button } from "@/shared/ui";
import { useMounted } from "@/shared/hooks";
import { usePrivacyPreferences } from "../model/PrivacyPreferencesProvider";
import styles from "./ConsentBanner.module.scss";

const HERO_INTRO_FALLBACK_MS = 6000;

export function ConsentBanner() {
    const t = useTranslations("privacyPreferences");
    const mounted = useMounted();
    const { isBannerVisible, acceptOptional, rejectOptional, openPanel } = usePrivacyPreferences();
    const heroIntroComplete = useHeroIntroComplete(usePathname() === "/", HERO_INTRO_FALLBACK_MS);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isBannerVisible && heroIntroComplete && (
                <m.div
                    className={styles.banner}
                    role="region"
                    aria-label={t("panelTitle")}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <p className={styles.text}>
                        {t.rich("bannerText", {
                            cookies: (chunks) => (
                                <Link href="/legal/cookies" className={styles.link}>
                                    {chunks}
                                </Link>
                            ),
                        })}
                        <span aria-hidden="true"> · </span>
                        <button type="button" className={styles.manageLink} onClick={openPanel}>
                            {t("bannerSettings")}
                        </button>
                    </p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={cn(styles.choice, styles.rejectButton)}
                            onClick={rejectOptional}
                        >
                            {t("rejectOptional")}
                        </button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={acceptOptional}
                            className={cn(styles.choice, styles.acceptButton)}
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
