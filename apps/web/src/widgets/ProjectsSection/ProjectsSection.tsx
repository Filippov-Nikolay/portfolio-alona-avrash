"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ShowcaseItem } from "@/shared/types";
import type { Project, HomeProjectGalleryCard } from "@avrash/content-schema";
import { ShowcaseModal } from "@avrash/ui";
import { ArrowIcon, Button, Container, Section } from "@/shared/ui";
import { trackEvent } from "@/shared/analytics/analytics";
import { cn } from "@/shared/lib/cn";
import { useProjectsSectionAnimations } from "./useProjectsSectionAnimations";
import styles from "./ProjectsSection.module.scss";

interface ProjectsSectionLabels {
    title: string;
    viewAll: string;
    viewLabel: string;
}

interface ProjectsSectionProps {
    projects: Project[];
    cards: HomeProjectGalleryCard[];
    visibleCardCount: number;
    modalItems: ShowcaseItem[];
    labels: ProjectsSectionLabels;
}

export function ProjectsSection({
    projects,
    cards,
    visibleCardCount,
    modalItems,
    labels,
}: ProjectsSectionProps) {
    const locale = useLocale();
    const modalT = useTranslations("modal");
    const modalLabels = {
        viewWebsite: modalT("viewWebsite"),
        overviewTab: modalT("overviewTab"),
        galleryTab: modalT("galleryTab"),
        galleryPreview: modalT("galleryPreview"),
        tools: modalT("tools"),
    };
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
    const [shouldPreloadImages, setShouldPreloadImages] = useState(false);
    const pointerTypeRef = useRef<string>("mouse");
    const {
        sectionRef,
        sceneRef,
        titleRef,
        viewAllRef,
        setActiveIndex: setGalleryActiveIndex,
    } = useProjectsSectionAnimations();
    const selectedItem = selectedIndex === null ? null : (modalItems[selectedIndex] ?? null);
    const activeIndex = pinnedIndex ?? hoveredIndex;

    useEffect(() => {
        if (!selectedItem) return;
        trackEvent("project_open", { entityId: String(selectedItem.id) });
    }, [selectedItem]);
    const finalCards = cards.slice(0, Math.max(0, Math.floor(visibleCardCount)));
    const getSourceIndex = (image: HomeProjectGalleryCard["image"]) =>
        projects.findIndex((project) => {
            const heroImage =
                project.image.find((projectImage) => projectImage.isHero) ?? project.image[0];

            return heroImage?.src === image.src;
        });
    const createTrackItem = (
        image: HomeProjectGalleryCard["image"],
        instanceType: "main" | "final-tail"
    ) => {
        const sourceIndex = getSourceIndex(image);

        return {
            image,
            label: image.alt ?? labels.viewLabel,
            sourceIndex: sourceIndex === -1 ? null : sourceIndex,
            instanceType,
        };
    };
    const trackItems = [
        ...cards.map(({ image }) => createTrackItem(image, "main")),
        ...finalCards.map(({ image }) => createTrackItem(image, "final-tail")),
    ];

    useEffect(() => {
        setGalleryActiveIndex(activeIndex);
    }, [activeIndex, setGalleryActiveIndex]);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section || shouldPreloadImages) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;

                setShouldPreloadImages(true);
                observer.disconnect();
            },
            { rootMargin: "200% 0px" }
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [sectionRef, shouldPreloadImages]);

    if (cards.length === 0) {
        return null;
    }

    return (
        <Section id="projects" ref={sectionRef} className={styles.section}>
            <Container className={styles.container}>
                <div ref={sceneRef} className={styles.stage}>
                    <h2 ref={titleRef} className={styles.ghostTitle} aria-hidden="true">
                        {labels.title}
                    </h2>

                    {trackItems.map(({ image, label, sourceIndex, instanceType }, index) => {
                        const isFinalTail = instanceType === "final-tail";

                        return (
                            <button
                                key={`${instanceType}-${image?.src ?? label}-${index}`}
                                type="button"
                                className={cn(
                                    styles.cardTransform,
                                    activeIndex === index && styles.cardTransformActive
                                )}
                                data-project-card
                                data-project-instance={isFinalTail ? "final-tail" : "main"}
                                aria-label={`${labels.viewLabel}: ${label}`}
                                aria-pressed={activeIndex === index}
                                onPointerEnter={(event) => {
                                    if (event.pointerType === "mouse") setHoveredIndex(index);
                                }}
                                onPointerLeave={(event) => {
                                    if (event.pointerType === "mouse") setHoveredIndex(null);
                                }}
                                onPointerDown={(event) => {
                                    pointerTypeRef.current = event.pointerType;
                                }}
                                onClick={() => {
                                    if (sourceIndex === null) return;

                                    if (pointerTypeRef.current !== "mouse") {
                                        if (pinnedIndex !== index) {
                                            setPinnedIndex(index);
                                            return;
                                        }
                                    }

                                    setSelectedIndex(sourceIndex);
                                }}
                            >
                                <span className={styles.interactionLayer} data-project-interaction>
                                    <span className={styles.card}>
                                        {image?.src && (
                                            <Image
                                                src={image.src}
                                                alt={image.alt ?? label}
                                                fill
                                                className={styles.image}
                                                sizes="(max-width: 479px) 260px, 278px"
                                                loading={shouldPreloadImages ? "eager" : "lazy"}
                                                fetchPriority="low"
                                                draggable={false}
                                            />
                                        )}
                                    </span>
                                    <span className={styles.cardLabel} aria-hidden="true">
                                        {label}
                                    </span>
                                </span>
                            </button>
                        );
                    })}

                    <Button
                        as="a"
                        ref={viewAllRef}
                        href={`/${locale}/works`}
                        variant="primary"
                        size="lg"
                        className={styles.viewAll}
                        rightIcon={<ArrowIcon className={styles.viewAllArrow} />}
                    >
                        {labels.viewAll}
                    </Button>
                </div>
            </Container>

            <ShowcaseModal
                item={selectedItem}
                onClose={() => setSelectedIndex(null)}
                labels={modalLabels}
                onTabChange={(tab) => {
                    // Only the switch-to-gallery direction is a deeper-
                    // engagement signal - going back to overview isn't.
                    if (tab === "gallery" && selectedItem) {
                        trackEvent("project_gallery_view", {
                            entityId: String(selectedItem.id),
                        });
                    }
                }}
                onVisitWebsite={() =>
                    trackEvent("project_external_click", {
                        entityId: selectedItem ? String(selectedItem.id) : undefined,
                    })
                }
            />
        </Section>
    );
}
