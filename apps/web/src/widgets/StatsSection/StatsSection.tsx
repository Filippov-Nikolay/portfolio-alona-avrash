"use client";

import { useMemo } from "react";
import { type MotionValue } from "framer-motion";
import type { StatItem } from "@avrash/content-schema";
import { Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useStatsSectionAnimations } from "./useStatsSectionAnimations";
import { buildDigitPlan, parseStatValue } from "./lib/parseStatValue";
import styles from "./StatsSection.module.scss";

const REEL_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function DigitReel({ place, continuous }: { place: number; continuous: boolean }) {
    return (
        <span className={styles.reel}>
            <span
                className={cn(styles.reelTrack, !continuous && styles.reelTrackDiscrete)}
                data-reel-place={place}
                data-reel-continuous={continuous}
            >
                {REEL_DIGITS.map((digit, i) => (
                    <span key={i} className={styles.reelDigit}>
                        {digit}
                    </span>
                ))}
            </span>
        </span>
    );
}

interface StatsSectionProps {
    items: StatItem[];
    id?: string;
    as?: "section" | "footer" | "div" | "article";
    className?: string;
    depthProgress?: MotionValue<number> | null;
}

export function StatsSection({
    items,
    id = "stats",
    as = "section",
    className,
    depthProgress,
}: StatsSectionProps) {
    const parsedValues = useMemo(() => items.map((item) => parseStatValue(item.value)), [items]);
    const digitPlans = useMemo(
        () => parsedValues.map((parsed) => (parsed.isAnimatable ? buildDigitPlan(parsed) : [])),
        [parsedValues]
    );
    const { sectionRef, gridRef, setValueRef } = useStatsSectionAnimations(
        parsedValues,
        depthProgress
    );

    return (
        <Section as={as} id={id} className={cn(styles.section, className)}>
            <Container>
                <div ref={sectionRef} className={styles.content}>
                    <div ref={gridRef} className={styles.grid}>
                        {items.map(({ id: itemId, value, label }, index) => {
                            const parsed = parsedValues[index];

                            return (
                                <div key={itemId} className={styles.stat}>
                                    <span
                                        className={styles.value}
                                        style={{ minWidth: `${value.length}ch` }}
                                    >
                                        <span className={styles.srOnly}>{value}</span>
                                        {parsed.isAnimatable ? (
                                            <span
                                                ref={setValueRef(index)}
                                                className={styles.digits}
                                                aria-hidden="true"
                                            >
                                                {parsed.prefix}
                                                {digitPlans[index].map((token, i) =>
                                                    token.type === "digit" ? (
                                                        <DigitReel
                                                            key={i}
                                                            place={token.place}
                                                            continuous={token.continuous}
                                                        />
                                                    ) : (
                                                        <span key={i}>{token.value}</span>
                                                    )
                                                )}
                                                {parsed.suffix}
                                            </span>
                                        ) : (
                                            <span aria-hidden="true">{value}</span>
                                        )}
                                    </span>
                                    <span className={styles.label}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
