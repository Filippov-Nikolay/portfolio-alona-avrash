"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowIcon, Button, Container, Section } from "@/shared/ui";
import { useMotionVariants } from "@/shared/hooks";
import { reveal } from "@/shared/lib/motion/reveal";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { useNotFoundOdometer } from "./useNotFoundOdometer";
import styles from "./NotFoundSection.module.scss";

// Only the first and last digit ever move (both count up to "4") - the
// middle one is always "0", so it just sits still as plain text.
const MOVING_DIGITS = ["0", "1", "2", "3", "4"];
const TEXT_REVEAL_DELAY_MS = 300;

function MovingDigit() {
    return (
        <span className={styles.reel}>
            <span className={styles.reelTrack} data-reel-move="true">
                {MOVING_DIGITS.map((digit, i) => (
                    <span key={i} className={styles.reelDigit}>
                        {digit}
                    </span>
                ))}
            </span>
        </span>
    );
}

export function NotFoundSection() {
    const t = useTranslations("notFound");
    const locale = useLocale();
    const { containerRef } = useNotFoundOdometer();

    const safeStagger = useMotionVariants(staggerContainer);
    const safeReveal = useMotionVariants(reveal);

    const [textReady, setTextReady] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setTextReady(true), TEXT_REVEAL_DELAY_MS);
        return () => clearTimeout(id);
    }, []);

    return (
        <Section as="div" className={styles.section}>
            <Container className={styles.container}>
                <div className={styles.stage}>
                    <div className={styles.topRail} aria-hidden="true">
                        <span className={styles.statusLabel} data-not-found-meta>
                            <span className={styles.statusDot} />
                            {t("eyebrow")}
                        </span>
                        <span className={styles.railLine} />
                        <span>AA / PORTFOLIO</span>
                    </div>

                    <div className={styles.numberStage}>
                        <div
                            className={`${styles.fragment} ${styles.fragmentLeft}`}
                            aria-hidden="true"
                            data-not-found-fragment
                        >
                            <Image
                                src="/projects/image-fizzup.png"
                                alt=""
                                fill
                                sizes="220px"
                                className={styles.fragmentImage}
                                priority
                            />
                            <span className={styles.fragmentIndex}>01</span>
                        </div>

                        <span ref={containerRef} className={styles.code} data-not-found-code>
                            <span className={styles.srOnly}>404</span>
                            <span aria-hidden="true" className={styles.digits}>
                                <MovingDigit />
                                <span className={styles.staticDigit}>
                                    <span className={styles.zeroMedia}>
                                        <Image
                                            src="/projects/image-esencha.png"
                                            alt=""
                                            fill
                                            sizes="(max-width: 767px) 90px, 210px"
                                            className={styles.zeroImage}
                                            priority
                                        />
                                        <span className={styles.zeroLabel}>LOST</span>
                                    </span>
                                </span>
                                <MovingDigit />
                            </span>
                        </span>

                        <div
                            className={`${styles.fragment} ${styles.fragmentRight}`}
                            aria-hidden="true"
                            data-not-found-fragment
                        >
                            <Image
                                src="/projects/image-logofolio.png"
                                alt=""
                                fill
                                sizes="220px"
                                className={styles.fragmentImage}
                                priority
                            />
                            <span className={styles.fragmentIndex}>02</span>
                        </div>
                    </div>

                    <m.div
                        className={styles.textGroup}
                        variants={safeStagger}
                        initial="hidden"
                        animate={textReady ? "visible" : "hidden"}
                    >
                        <m.div className={styles.titleGroup} variants={safeReveal}>
                            <span className={styles.sectionIndex} data-not-found-meta>
                                01 / ERROR
                            </span>
                            <h1 className={styles.title}>{t("title")}</h1>
                        </m.div>

                        <m.div className={styles.copyGroup} variants={safeReveal}>
                            <p className={styles.text}>{t("description")}</p>
                            <div className={styles.actions}>
                                <Button
                                    as="a"
                                    href={`/${locale}`}
                                    variant="primary"
                                    size="lg"
                                    className={`${styles.button} ${styles.primaryButton}`}
                                    rightIcon={<ArrowIcon className={styles.buttonArrow} />}
                                >
                                    {t("button")}
                                </Button>
                                <Button
                                    as="a"
                                    href={`/${locale}/works`}
                                    variant="outline"
                                    size="lg"
                                    className={`${styles.button} ${styles.worksButton}`}
                                    rightIcon={<ArrowIcon className={styles.buttonArrow} />}
                                >
                                    {t("worksButton")}
                                </Button>
                            </div>
                        </m.div>
                    </m.div>

                    <div className={styles.bottomRail} aria-hidden="true">
                        <span>AVRASH.COM</span>
                        <span>PAGE INDEX / 404</span>
                    </div>
                </div>
            </Container>
        </Section>
    );
}
