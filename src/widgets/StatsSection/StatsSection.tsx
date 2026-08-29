"use client";

import { useTranslations } from "next-intl";
import type { StatItem } from "@/entities/stat/model/stat";
import { Container, Section, SectionHeader } from "@/shared/ui";
import { useStatsSectionAnimations } from "./useStatsSectionAnimations";
import styles from "./StatsSection.module.scss";

interface StatsSectionProps {
    items: StatItem[];
}

export function StatsSection({ items }: StatsSectionProps) {
    const t = useTranslations("stats");

    const { sectionRef, headerRef, headerLeadRef, gridRef } = useStatsSectionAnimations();

    return (
        <Section id="stats" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={headerLeadRef} title="TRACK RECORD" />
                        <p className={styles.subtitle}>{t("subtitle")}</p>
                    </div>

                    <div ref={gridRef} className={styles.grid}>
                        {items.map(({ id, value, label }) => (
                            <div key={id} className={styles.stat}>
                                <span className={styles.value}>{value}</span>
                                <span className={styles.label}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
