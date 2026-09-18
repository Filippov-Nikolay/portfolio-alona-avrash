"use client";

import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Service } from "@/entities/service/model/service";
import { Container, Section, ArrowIcon } from "@/shared/ui";
import { useServicesSectionAnimations } from "./useServicesSectionAnimations";
import styles from "./ServicesSection.module.scss";

interface ServicesSectionProps {
    services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
    const t = useTranslations("categories");
    const locale = useLocale();
    const { sectionRef, titleRef, gridRef } = useServicesSectionAnimations(services);

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
                                            href={`/${locale}/contact`}
                                            className={styles.approachLink}
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
