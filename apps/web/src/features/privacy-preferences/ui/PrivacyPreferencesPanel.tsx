"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { Button, CloseIcon } from "@/shared/ui";
import { useMounted } from "@/shared/hooks";
import type { PrivacyPreferences } from "@/shared/lib/privacyPreferences";
import { usePrivacyPreferences } from "../model/PrivacyPreferencesProvider";
import styles from "./PrivacyPreferencesPanel.module.scss";

export function PrivacyPreferencesPanel() {
    const t = useTranslations("privacyPreferences");
    const titleId = useId();
    const mounted = useMounted();
    const {
        isPanelOpen,
        closePanel,
        preferences,
        analytics,
        acceptOptional,
        rejectOptional,
        savePreferences,
    } = usePrivacyPreferences();

    const [draft, setDraft] = useState<PrivacyPreferences>({ preferences, analytics });

    useEffect(() => {
        if (!isPanelOpen) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({ preferences, analytics });
    }, [isPanelOpen, preferences, analytics]);

    useEffect(() => {
        if (!isPanelOpen) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") closePanel();
        }

        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [isPanelOpen, closePanel]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isPanelOpen && (
                <m.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closePanel}
                >
                    <m.div
                        className={styles.panel}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.closeButton}
                            onClick={closePanel}
                            aria-label={t("close")}
                        >
                            <CloseIcon aria-hidden="true" />
                        </button>

                        <h2 id={titleId} className={styles.title}>
                            {t("panelTitle")}
                        </h2>

                        <div className={styles.categories}>
                            <div className={styles.category}>
                                <div className={styles.categoryHeader}>
                                    <span className={styles.categoryTitle}>
                                        {t("categoryNecessaryTitle")}
                                    </span>
                                    <span className={styles.alwaysActive}>{t("alwaysActive")}</span>
                                </div>
                                <p className={styles.categoryDescription}>
                                    {t("categoryNecessaryDescription")}
                                </p>
                            </div>

                            <label className={styles.category}>
                                <div className={styles.categoryHeader}>
                                    <span className={styles.categoryTitle}>
                                        {t("categoryPreferencesTitle")}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={draft.preferences}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                preferences: event.target.checked,
                                            }))
                                        }
                                    />
                                </div>
                                <p className={styles.categoryDescription}>
                                    {t("categoryPreferencesDescription")}
                                </p>
                            </label>

                            <label className={styles.category}>
                                <div className={styles.categoryHeader}>
                                    <span className={styles.categoryTitle}>
                                        {t("categoryAnalyticsTitle")}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={draft.analytics}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                analytics: event.target.checked,
                                            }))
                                        }
                                    />
                                </div>
                                <p className={styles.categoryDescription}>
                                    {t("categoryAnalyticsDescription")}
                                </p>
                            </label>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={rejectOptional}
                            >
                                {t("rejectOptional")}
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={acceptOptional}
                            >
                                {t("acceptOptional")}
                            </button>
                            <Button type="button" size="sm" onClick={() => savePreferences(draft)}>
                                {t("savePreferences")}
                            </Button>
                        </div>
                    </m.div>
                </m.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

PrivacyPreferencesPanel.displayName = "PrivacyPreferencesPanel";
