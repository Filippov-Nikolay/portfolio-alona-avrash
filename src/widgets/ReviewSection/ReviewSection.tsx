"use client";

import { useTranslations } from "next-intl";
import type { Review } from "@/entities/review/model/review";
import { Container, Section, SectionHeader } from "@/shared/ui";
import { useReviewSectionAnimations } from "./useReviewSectionAnimations";
import styles from "./ReviewSection.module.scss";

interface ReviewSectionProps {
    reviews: Review[];
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
    const t = useTranslations("reviews");
    const { sectionRef, headerRef, headerLeadRef, listRef } = useReviewSectionAnimations();

    if (reviews.length === 0) return null;

    return (
        <Section id="reviews" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={headerLeadRef} title="TESTIMONIALS" />
                        <p className={styles.subtitle}>{t("subtitle")}</p>
                    </div>

                    <div ref={listRef} className={styles.list}>
                        {reviews.map((review) => (
                            <blockquote key={review.id} className={styles.quote}>
                                <p className={styles.text}>&ldquo;{review.comment}&rdquo;</p>
                                <cite className={styles.author}>
                                    {review.name} — {review.nameProject}
                                </cite>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
