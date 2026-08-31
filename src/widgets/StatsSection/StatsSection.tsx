"use client";

import { useMemo } from "react";
import type { StatItem } from "@/entities/stat/model/stat";
import { Container, Section } from "@/shared/ui";
import { useStatsSectionAnimations } from "./useStatsSectionAnimations";
import { parseStatValue } from "./lib/parseStatValue";
import styles from "./StatsSection.module.scss";

interface StatsSectionProps {
    items: StatItem[];
}

export function StatsSection({ items }: StatsSectionProps) {
    const parsedValues = useMemo(() => items.map((item) => parseStatValue(item.value)), [items]);
    const { sectionRef, gridRef, setValueRef } = useStatsSectionAnimations(parsedValues);

    return (
        <Section id="stats" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    <div ref={gridRef} className={styles.grid}>
                        {items.map(({ id, value, label }, index) => (
                            <div key={id} className={styles.stat}>
                                <span
                                    ref={setValueRef(index)}
                                    className={styles.value}
                                    style={{ minWidth: `${value.length}ch` }}
                                >
                                    {value}
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
