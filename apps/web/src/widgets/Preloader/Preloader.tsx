"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { usePreloader } from "@/shared/providers";
import { siteConfig, siteInitials } from "@/shared/config/site.config";
import styles from "./Preloader.module.scss";

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
const WIPE_EASE = [0.65, 0, 0.35, 1] as const;
const PROGRESS_EASE = [0.65, 0, 0.35, 1] as const;

const CHAR_STAGGER_S = 0.055;
const WORD_DELAY_S = 0.24;
const PROGRESS_DELAY_S = 0.62;
const PROGRESS_DURATION_S = 1.45;

const nameParts = siteConfig.name.split(" ").filter(Boolean);
const FIRST_NAME = nameParts[0] ?? siteConfig.name;
const LAST_NAME = nameParts.at(-1) ?? siteConfig.name;

function AnimatedWord({ text }: { text: string }) {
    return (
        <span className={styles.wordGlyphs} aria-hidden="true">
            {Array.from(text).map((character, index) => (
                <span key={`${character}-${index}`} className={styles.charMask}>
                    <m.span
                        className={styles.char}
                        initial={{ y: "112%" }}
                        animate={{ y: "0%" }}
                        transition={{
                            duration: 0.72,
                            delay: WORD_DELAY_S + index * CHAR_STAGGER_S,
                            ease: REVEAL_EASE,
                        }}
                    >
                        {character}
                    </m.span>
                </span>
            ))}
        </span>
    );
}

function StaticWord({ text }: { text: string }) {
    return (
        <span className={styles.wordGlyphs} aria-hidden="true">
            {Array.from(text).map((character, index) => (
                <span key={`${character}-${index}`} className={styles.staticChar}>
                    {character}
                </span>
            ))}
        </span>
    );
}

function useCountUp(active: boolean, durationS: number, delayS: number): number {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;

        let frame = 0;
        let startedAt: number | null = null;

        const tick = (now: number) => {
            if (startedAt === null) startedAt = now;
            const elapsedS = (now - startedAt) / 1000 - delayS;

            if (elapsedS < 0) {
                frame = requestAnimationFrame(tick);
                return;
            }

            const progress = Math.min(1, elapsedS / durationS);
            const nextValue = Math.round(progress * 100);
            setValue((current) => (current === nextValue ? current : nextValue));

            if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [active, durationS, delayS]);

    return value;
}

export function Preloader() {
    const { isShown, onExitComplete } = usePreloader();
    const reduceMotion = useReducedMotion();
    const percent = useCountUp(isShown && !reduceMotion, PROGRESS_DURATION_S, PROGRESS_DELAY_S);
    const formattedPercent = String(reduceMotion ? 100 : percent).padStart(3, "0");

    return (
        <AnimatePresence onExitComplete={onExitComplete}>
            {isShown && (
                <m.div
                    className={`${styles.overlay} ${styles.firstVisitOverlay}`}
                    initial={reduceMotion ? false : { y: "0%" }}
                    exit={reduceMotion ? { opacity: 0 } : { y: "-100%" }}
                    transition={{
                        duration: reduceMotion ? 0.15 : 0.82,
                        ease: reduceMotion ? "linear" : WIPE_EASE,
                    }}
                    role="status"
                    aria-label={`Loading ${siteConfig.name}'s portfolio`}
                >
                    <div className={styles.frame}>
                        <m.div
                            className={styles.topLine}
                            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: REVEAL_EASE }}
                        >
                            <div className={styles.brandLockup}>
                                <span className={styles.brandName}>{siteConfig.name}</span>
                                <span className={styles.brandRole}>{siteConfig.title}</span>
                            </div>
                            <span className={styles.edition}>{siteInitials} / Portfolio</span>
                        </m.div>

                        <div className={styles.stage}>
                            <m.span
                                className={styles.kicker}
                                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.14, ease: REVEAL_EASE }}
                                aria-hidden="true"
                            >
                                {FIRST_NAME}
                            </m.span>

                            <div className={styles.word}>
                                <div className={styles.wordBase}>
                                    {reduceMotion ? (
                                        <StaticWord text={LAST_NAME} />
                                    ) : (
                                        <AnimatedWord text={LAST_NAME} />
                                    )}
                                </div>
                                <m.div
                                    className={styles.wordFill}
                                    initial={
                                        reduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }
                                    }
                                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                                    transition={{
                                        duration: reduceMotion ? 0 : PROGRESS_DURATION_S,
                                        delay: reduceMotion ? 0 : PROGRESS_DELAY_S,
                                        ease: PROGRESS_EASE,
                                    }}
                                >
                                    <StaticWord text={LAST_NAME} />
                                </m.div>
                            </div>
                            <span className={styles.srOnly}>
                                Loading {siteConfig.name}&apos;s portfolio
                            </span>
                        </div>

                        <m.div
                            className={styles.progressDock}
                            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.44, ease: REVEAL_EASE }}
                        >
                            <div className={styles.progressMeta} aria-hidden="true">
                                <span className={styles.progressLabel}>Loading portfolio</span>
                                <span className={styles.percent}>{formattedPercent}</span>
                            </div>
                            <div className={styles.barTrack} aria-hidden="true">
                                <m.div
                                    className={styles.barFill}
                                    initial={reduceMotion ? false : { scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{
                                        duration: reduceMotion ? 0 : PROGRESS_DURATION_S,
                                        delay: reduceMotion ? 0 : PROGRESS_DELAY_S,
                                        ease: PROGRESS_EASE,
                                    }}
                                />
                            </div>
                        </m.div>
                    </div>

                    <div className={styles.wipeEdge} aria-hidden="true" />
                </m.div>
            )}
        </AnimatePresence>
    );
}
