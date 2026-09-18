"use client";

import { useEffect, useState } from "react";
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
                <span ref={containerRef} className={styles.code}>
                    <span className={styles.srOnly}>404</span>
                    <span aria-hidden="true" className={styles.digits}>
                        <MovingDigit />
                        <span className={styles.staticDigit}>0</span>
                        <MovingDigit />
                    </span>
                </span>

                <m.div
                    className={styles.textGroup}
                    variants={safeStagger}
                    initial="hidden"
                    animate={textReady ? "visible" : "hidden"}
                >
                    <m.h1 className={styles.title} variants={safeReveal}>
                        {t("title")}
                    </m.h1>
                    <m.p className={styles.text} variants={safeReveal}>
                        {t("description")}
                    </m.p>
                    <m.div variants={safeReveal}>
                        <Button
                            as="a"
                            href={`/${locale}`}
                            variant="primary"
                            size="lg"
                            className={styles.button}
                            rightIcon={<ArrowIcon className={styles.buttonArrow} />}
                        >
                            {t("button")}
                        </Button>
                    </m.div>
                </m.div>
            </Container>
        </Section>
    );
}
