"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import type { Review } from "@avrash/content-schema";
import { ArrowIcon, Container, QuoteIcon, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useReviewSectionAnimations } from "./useReviewSectionAnimations";
import styles from "./ReviewSection.module.scss";

const COPIES = 3;

interface ReviewSectionLabels {
    title: string;
}

interface ReviewSectionProps {
    reviews: Review[];
    labels: ReviewSectionLabels;
}

export function ReviewSection({ reviews, labels }: ReviewSectionProps) {
    const totalItems = reviews.length;
    const { sectionRef, titleRef, asideRef, trackRef } = useReviewSectionAnimations(totalItems);

    const slideDeck = useMemo(
        () => Array.from({ length: COPIES }, () => reviews).flat(),
        [reviews]
    );
    const middleStartIndex = totalItems;

    const emblaPlugins = useMemo(
        () => [WheelGesturesPlugin({ wheelDraggingClass: styles.wheelDragging })],
        []
    );
    const [viewportRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            align: "center",
            startIndex: middleStartIndex,
            breakpoints: {
                "(max-width: 767px)": { align: "start" },
            },
        },
        emblaPlugins
    );

    const [selectedIndex, setSelectedIndex] = useState(middleStartIndex);
    const dragStartX = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
        if (!emblaApi) return;
        const api = emblaApi;
        const update = () => setSelectedIndex(api.selectedScrollSnap());

        update();
        api.on("select", update);
        api.on("reInit", update);

        return () => {
            api.off("select", update);
            api.off("reInit", update);
        };
    }, [emblaApi]);

    const handleSlideClick = useCallback(
        (event: React.MouseEvent, index: number) => {
            if (!emblaApi || isDragging.current) return;
            if (emblaApi.selectedScrollSnap() !== index) {
                event.preventDefault();
                emblaApi.scrollTo(index);
            }
        },
        [emblaApi]
    );

    if (totalItems === 0) {
        return null;
    }

    return (
        <Section id="reviews" ref={sectionRef} className={styles.section}>
            <Container className={styles.header}>
                <h2 ref={titleRef} className={styles.title}>
                    {labels.title}
                </h2>

                <div ref={asideRef} className={styles.aside}>
                    <div className={styles.decor} aria-hidden="true">
                        <span
                            className={cn(styles.decorShape, styles.decorShapeBack)}
                            data-review-decor-back
                        />
                        <span
                            className={cn(styles.decorShape, styles.decorShapeFront)}
                            data-review-decor-front
                        />
                    </div>

                    <div className={styles.nav}>
                        <button
                            type="button"
                            className={cn(styles.navButton, styles.navButtonPrev)}
                            onClick={() => emblaApi?.scrollPrev()}
                            aria-label="Previous review"
                            data-review-nav-item
                        >
                            <ArrowIcon className={styles.navIcon} />
                        </button>
                        <span className={styles.navDivider} aria-hidden="true" data-review-nav-item>
                            /
                        </span>
                        <button
                            type="button"
                            className={cn(styles.navButton, styles.navButtonNext)}
                            onClick={() => emblaApi?.scrollNext()}
                            aria-label="Next review"
                            data-review-nav-item
                        >
                            <ArrowIcon className={styles.navIcon} />
                        </button>
                    </div>
                </div>
            </Container>

            <div ref={trackRef} className={styles.carouselWrap}>
                <div
                    ref={viewportRef}
                    className={styles.viewport}
                    tabIndex={0}
                    role="region"
                    aria-label="Reviews carousel"
                    onKeyDown={(event) => {
                        if (event.key === "ArrowLeft") {
                            event.preventDefault();
                            emblaApi?.scrollPrev();
                        }
                        if (event.key === "ArrowRight") {
                            event.preventDefault();
                            emblaApi?.scrollNext();
                        }
                    }}
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        dragStartX.current = event.clientX;
                        isDragging.current = false;
                    }}
                    onPointerUp={(event) => {
                        if (Math.abs(event.clientX - dragStartX.current) > 5) {
                            isDragging.current = true;
                            setTimeout(() => {
                                isDragging.current = false;
                            }, 0);
                        }
                    }}
                >
                    <div className={styles.track}>
                        {slideDeck.map((review, index) => {
                            const isActive = index === selectedIndex;

                            return (
                                <div
                                    key={`${review.id}-${index}`}
                                    className={styles.slot}
                                    onClick={(event) => handleSlideClick(event, index)}
                                >
                                    <blockquote
                                        className={cn(styles.card, isActive && styles.cardActive)}
                                        data-review-card
                                    >
                                        <div className={styles.cardTop}>
                                            <QuoteIcon className={styles.quoteIcon} />
                                            <span className={styles.projectName}>
                                                {review.nameProject}
                                            </span>
                                        </div>
                                        <p className={styles.comment}>{review.comment}</p>
                                        <cite className={styles.personName}>{review.name}</cite>
                                    </blockquote>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Section>
    );
}
