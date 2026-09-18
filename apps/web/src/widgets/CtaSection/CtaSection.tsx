"use client";

import type { CSSProperties } from "react";
import { useLocale } from "next-intl";
import type { CtaContent } from "@avrash/content-schema";
import { ArrowIcon, Button, Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useCtaSectionAnimations } from "./useCtaSectionAnimations";
import styles from "./CtaSection.module.scss";

export type CtaSectionVariant = "section" | "banner";

interface CtaSectionProps {
    content: CtaContent;
    // "section" (default) is the full-bleed, page-ending block used on the
    // home page. "banner" is a compact accent card meant to sit inline in a
    // list (e.g. the Works page catalog) - same copy, animation and button,
    // just re-themed and unwrapped from Section/Container's own bleed.
    variant?: CtaSectionVariant;
}

const STAGGER_STEP_MS = 45;
const CHAR_TRANSITION_MS = 220;
const ARROW_POP_MS = 300;
const BG_FILL_RATIO = 0.7;

function cascadeDurationMs(text: string) {
    return Math.max(text.length - 1, 0) * STAGGER_STEP_MS + CHAR_TRANSITION_MS;
}

function StaggerText({ text }: { text: string }) {
    return (
        <span className={styles.buttonText} aria-hidden="true">
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className={styles.charCol}
                    style={{ "--stagger-delay": `${i * STAGGER_STEP_MS}ms` } as CSSProperties}
                >
                    <span className={styles.charTop}>{char}</span>
                    <span className={styles.charBottom}>{char}</span>
                </span>
            ))}
        </span>
    );
}

export function CtaSection({ content, variant = "section" }: CtaSectionProps) {
    const locale = useLocale();
    const { sectionRef, headingRef, availabilityRef, buttonRef } = useCtaSectionAnimations();
    const cascadeMs = cascadeDurationMs(content.buttonLabel);
    const bgFillMs = Math.round(cascadeMs * BG_FILL_RATIO);
    const arrowDelayMs = Math.max(cascadeMs - ARROW_POP_MS, 0);
    const isBanner = variant === "banner";

    const body = (
        <>
            <h2 ref={headingRef} className={cn(styles.heading, isBanner && styles.bannerHeading)}>
                {content.heading}
            </h2>

            <div className={cn(styles.aside, isBanner && styles.bannerAside)}>
                <p
                    ref={availabilityRef}
                    className={cn(styles.availability, isBanner && styles.bannerAvailability)}
                >
                    {content.availability}
                </p>
                <Button
                    as="a"
                    ref={buttonRef}
                    href={`/${locale}/contact`}
                    variant="second"
                    className={cn(styles.button, isBanner && styles.bannerButton)}
                    style={
                        {
                            "--bg-fill-duration": `${bgFillMs}ms`,
                            "--arrow-pop-delay": `${arrowDelayMs}ms`,
                        } as CSSProperties
                    }
                    rightIcon={
                        <span className={styles.buttonArrowWrap} data-cta-arrow>
                            <ArrowIcon className={styles.buttonArrow} />
                        </span>
                    }
                >
                    <span className={styles.srOnly}>{content.buttonLabel}</span>
                    <StaggerText text={content.buttonLabel} />
                </Button>
            </div>
        </>
    );

    if (isBanner) {
        return (
            <Section as="div" ref={sectionRef} className={styles.banner}>
                <div className={cn(styles.inner, styles.bannerInner)}>{body}</div>
            </Section>
        );
    }

    return (
        <Section id="cta" ref={sectionRef} className={styles.section}>
            <Container className={styles.inner}>{body}</Container>
        </Section>
    );
}
