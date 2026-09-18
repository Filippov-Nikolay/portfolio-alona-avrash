"use client";

import { AnimatePresence, m } from "framer-motion";
import { usePreloader } from "@/shared/providers";
import { siteConfig, siteInitials } from "@/shared/config/site.config";
import styles from "./Preloader.module.scss";

const EASE_OUT = [0.4, 0, 0.2, 1] as const;

export function Preloader() {
    const { isShown, onExitComplete } = usePreloader();

    return (
        <AnimatePresence onExitComplete={onExitComplete}>
            {isShown && (
                <m.div
                    className={styles.overlay}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.65, ease: EASE_OUT }}
                >
                    <div className={styles.center}>
                        {/* Monogram logo, derived from siteConfig.name */}
                        <m.div
                            className={styles.logo}
                            initial={{ opacity: 0, scale: 0.72 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 280,
                                damping: 22,
                                delay: 0.1,
                            }}
                        >
                            {siteInitials}
                        </m.div>

                        {/* Name */}
                        <m.p
                            className={styles.name}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.45 }}
                        >
                            {siteConfig.name}
                        </m.p>

                        {/* Progress bar */}
                        <m.div
                            className={styles.barTrack}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, delay: 0.6 }}
                        >
                            <m.div
                                className={styles.barFill}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{
                                    duration: 1.35,
                                    delay: 0.7,
                                    ease: [0.25, 0.1, 0.25, 1],
                                }}
                            />
                        </m.div>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
