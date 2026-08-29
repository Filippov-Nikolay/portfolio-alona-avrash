"use client";

import { useTranslations } from "next-intl";
import type { Service } from "@/entities/service/model/service";
import { Container, Section, SectionHeader } from "@/shared/ui";
import { useServicesSectionAnimations } from "./useServicesSectionAnimations";
import styles from "./ServicesSection.module.scss";

interface ServicesSectionProps {
    services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
    const t = useTranslations("categories");
    const tSection = useTranslations("services");
    const { sectionRef, headerRef, headerLeadRef, gridRef } = useServicesSectionAnimations();

    return (
        <Section id="services" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={headerLeadRef} title="SERVICES" />
                        <p className={styles.subtitle}>{tSection("subtitle")}</p>
                    </div>

                    <div ref={gridRef} className={styles.grid}>
                        {services.map((service) => (
                            <article key={service.id} className={styles.card}>
                                <h3 className={styles.title}>{t(service.title)}</h3>
                                <p className={styles.description}>{service.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
