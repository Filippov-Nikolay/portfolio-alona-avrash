"use client";

import type { CtaContent } from "@/entities/cta/model/cta";
import { ArrowIcon, Button, Container, Section } from "@/shared/ui";
import { useCtaSectionAnimations } from "./useCtaSectionAnimations";
import styles from "./CtaSection.module.scss";

interface CtaSectionProps {
    content: CtaContent;
}

export function CtaSection({ content }: CtaSectionProps) {
    const { sectionRef, headingRef, availabilityRef, buttonRef } = useCtaSectionAnimations();

    return (
        <Section id="cta" ref={sectionRef} className={styles.section}>
            <Container className={styles.inner}>
                <h2 ref={headingRef} className={styles.heading}>
                    {content.heading}
                </h2>

                <div className={styles.aside}>
                    <p ref={availabilityRef} className={styles.availability}>
                        {content.availability}
                    </p>
                    <Button
                        as="a"
                        ref={buttonRef}
                        href="#contact"
                        variant="second"
                        className={styles.button}
                        rightIcon={
                            <span className={styles.buttonArrowWrap}>
                                <ArrowIcon className={styles.buttonArrow} data-cta-arrow />
                            </span>
                        }
                    >
                        {content.buttonLabel}
                    </Button>
                </div>
            </Container>
        </Section>
    );
}
