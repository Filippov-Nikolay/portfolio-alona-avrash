"use client";

import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Service } from "@/entities/service/model/service";
import { Container, Section, ArrowIcon } from "@/shared/ui";
import { scrollToElementId } from "@/shared/lib/scroll";
import { useServicesSectionAnimations } from "./useServicesSectionAnimations";
import styles from "./ServicesSection.module.scss";

interface ServicesSectionProps {
    services: Service[];
}

function handleApproachClick(e: React.MouseEvent) {
    e.preventDefault();
    scrollToElementId("contact", { offset: 80 });
}

export function ServicesSection({ services }: ServicesSectionProps) {
    const t = useTranslations("categories");
    const { sectionRef, titleRef, gridRef } = useServicesSectionAnimations();

    return (
        <Section id="services" ref={sectionRef} className={styles.section}>
            <h2 ref={titleRef} className={styles.ghostTitle} aria-hidden="true">
                SERVICES
            </h2>

            <Container>
                <div>
                    <div ref={gridRef} className={styles.grid}>
                        {services.map((service, index) => (
                            <Fragment key={service.id}>
                                <article
                                    className={styles.card}
                                    style={{ "--index": index } as CSSProperties}
                                >
                                    <div className={styles.textCol}>
                                        <h3 className={styles.title}>{t(service.title)}</h3>
                                        <p className={styles.description}>{service.description}</p>

                                        <a
                                            href="#contact"
                                            className={styles.approachLink}
                                            onClick={handleApproachClick}
                                        >
                                            {service.approachLabel}
                                            <ArrowIcon className={styles.approachArrow} />
                                        </a>
                                    </div>

                                    <div className={styles.visual}>
                                        {service.image.src && (
                                            <Image
                                                src={service.image.src}
                                                alt={service.image.alt ?? t(service.title)}
                                                fill
                                                className={styles.image}
                                                sizes="(max-width: 900px) 92vw, 420px"
                                            />
                                        )}
                                    </div>
                                </article>
                                {index < services.length - 1 && (
                                    <div className={styles.stackRunway} aria-hidden="true" />
                                )}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
