"use client";

import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Service } from "@avrash/content-schema";
import { Link } from "@/i18n/navigation";
import { trackEvent } from "@/shared/analytics/analytics";
import { Container, Section, ArrowIcon } from "@/shared/ui";
import { useServicesSectionAnimations } from "./useServicesSectionAnimations";
import styles from "./ServicesSection.module.scss";

interface ServicesSectionProps {
    services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
    const t = useTranslations("categories");
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
                                    data-service-card={service.title}
                                >
                                    <Link
                                        href={`/works?filter=${service.title}`}
                                        className={styles.cardLink}
                                        data-service-link={service.title}
                                        onClick={() =>
                                            trackEvent("works_filter", {
                                                entityId: service.title,
                                            })
                                        }
                                    >
                                        <div className={styles.textCol}>
                                            <h3 className={styles.title}>{t(service.title)}</h3>
                                            <p className={styles.description}>
                                                {service.description}
                                            </p>

                                            <span
                                                className={styles.approachLink}
                                                data-service-approach
                                            >
                                                {service.approachLabel}
                                                <ArrowIcon className={styles.approachArrow} />
                                            </span>
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
                                    </Link>
                                    <span
                                        className={styles.softener}
                                        data-service-softener
                                        hidden
                                        aria-hidden="true"
                                    />
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
