"use client";

import { useMemo } from "react";
import { type MotionValue } from "framer-motion";
import type { StatItem } from "@/entities/stat/model/stat";
import { Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useStatsSectionAnimations } from "./useStatsSectionAnimations";
import { formatStatValue, parseStatValue } from "./lib/parseStatValue";
import styles from "./StatsSection.module.scss";

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
    const initialValues = useMemo(
        () =>
            items.map((item, index) => {
                const parsed = parsedValues[index];

                if (!depthProgress || !parsed?.isAnimatable) {
                    return item.value;
                }

                return formatStatValue(0, parsed);
            }),
        [depthProgress, items, parsedValues]
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
                        {items.map(({ id: itemId, value, label }, index) => (
                            <div key={itemId} className={styles.stat}>
                                <span
                                    ref={setValueRef(index)}
                                    className={styles.value}
                                    style={{ minWidth: `${value.length}ch` }}
                                >
                                    {initialValues[index]}
                                </span>
                                <span className={styles.label}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
