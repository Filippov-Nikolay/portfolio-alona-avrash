"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ShowcaseItem } from "@/shared/types";
import type { Project } from "@avrash/content-schema";
import { Link } from "@/i18n/navigation";
import { ShowcaseModal } from "@avrash/ui";
import { Container, Section, ArrowIcon } from "@/shared/ui";
import { trackEvent } from "@/shared/analytics/analytics";
import { useMotionVariants } from "@/shared/hooks";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { useStatsSelectedChoreographyProgress } from "@/shared/lib/motion/StatsSelectedChoreographyContext";
import styles from "./SelectedWorkSection.module.scss";

interface SelectedWorkLabels {
    title: string;
    viewAll: string;
    viewLabel: string;
}

export interface SelectedWorkSectionProps {
    projects: Project[];
    modalItems: ShowcaseItem[];
    categoryLabels: string[][];
    labels: SelectedWorkLabels;
}

const CONTENT_REVEAL_PROGRESS = 0.3;

export function SelectedWorkSection({
    projects,
    modalItems,
    categoryLabels,
    labels,
}: SelectedWorkSectionProps) {
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const modalT = useTranslations("modal");
    const modalLabels = {
        viewWebsite: modalT("viewWebsite"),
        overviewTab: modalT("overviewTab"),
        galleryTab: modalT("galleryTab"),
        galleryPreview: modalT("galleryPreview"),
        tools: modalT("tools"),
    };
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const choreographyProgress = useStatsSelectedChoreographyProgress();
    const [isContentRevealed, setIsContentRevealed] = useState(
        () => !choreographyProgress || choreographyProgress.get() >= CONTENT_REVEAL_PROGRESS
    );

    useEffect(() => {
        if (!choreographyProgress || isContentRevealed) {
            return;
        }

        const unsubscribe = choreographyProgress.on("change", (latest) => {
            if (latest >= CONTENT_REVEAL_PROGRESS) {
                setIsContentRevealed(true);
            }
        });

        return unsubscribe;
    }, [choreographyProgress, isContentRevealed]);

    const selectedItem = selectedIndex === null ? null : (modalItems[selectedIndex] ?? null);

    useEffect(() => {
        if (!selectedItem) return;

        trackEvent("project_open", { entityId: String(selectedItem.id) });
    }, [selectedItem]);

    if (projects.length === 0) {
        return null;
    }

    const openProject = (index: number) => {
        setSelectedIndex(index);
    };

    return (
        <Section id="selected-work" className={styles.section}>
            <Container>
                <m.div
                    variants={safeStagger}
                    initial="hidden"
                    animate={isContentRevealed ? "visible" : "hidden"}
                >
                    <m.div className={styles.header} variants={safeFadeIn}>
                        <h2 className={styles.title}>{labels.title}</h2>
                        <Link href="/works" className={styles.viewAll}>
                            {labels.viewAll}
                            <ArrowIcon className={styles.viewAllArrow} />
                        </Link>
                    </m.div>

                    <div className={styles.grid}>
                        {projects.map((project, index) => {
                            const heroImage =
                                project.image.find((image) => image.isHero) ?? project.image[0];
                            const rank = project.selectedWork?.rank ?? index + 1;
                            const tags = categoryLabels[index] ?? [];
                            const year = new Date(project.createdAt).getFullYear();

                            return (
                                <m.div
                                    key={project.id}
                                    className={styles.card}
                                    variants={safeFadeIn}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${labels.viewLabel}: ${project.name}`}
                                    onClick={() => openProject(index)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            openProject(index);
                                        }
                                    }}
                                >
                                    <div className={styles.visual}>
                                        <span className={styles.badge} aria-hidden="true">
                                            {String(rank).padStart(2, "0")}
                                        </span>
                                        {heroImage?.src && (
                                            <div className={styles.imageMotion}>
                                                <Image
                                                    src={heroImage.src}
                                                    alt={heroImage.alt ?? project.name}
                                                    fill
                                                    className={styles.image}
                                                    sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, 340px"
                                                    draggable={false}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.info}>
                                        <h3 className={styles.cardTitle}>{project.name}</h3>
                                        {tags.length > 0 && (
                                            <p className={styles.cardTags}>{tags.join(" | ")}</p>
                                        )}
                                        <div className={styles.cardFooter}>
                                            <span className={styles.cardYear}>{year}</span>
                                            <span
                                                className={styles.cardArrowBtn}
                                                aria-hidden="true"
                                            >
                                                <ArrowIcon className={styles.cardArrow} />
                                            </span>
                                        </div>
                                    </div>
                                </m.div>
                            );
                        })}
                    </div>
                </m.div>
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
