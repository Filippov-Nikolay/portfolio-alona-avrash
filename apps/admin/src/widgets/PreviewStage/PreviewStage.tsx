"use client";

import { useEffect, useState } from "react";
import { Almarai, Zalando_Sans_SemiExpanded } from "next/font/google";
import { LazyMotion, domMax } from "framer-motion";
import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { WorksCard, ShowcaseModal, type ShowcaseModalLabels } from "@avrash/ui";
import type { ProjectInput } from "@/entities/project/api/projectsRepository";
import { toPreviewProject, toPreviewShowcaseItem } from "@/entities/project/lib/toPreview";
import styles from "./PreviewStage.module.scss";

const almarai = Almarai({
    subsets: ["latin"],
    weight: ["300", "400", "700", "800"],
    variable: "--font-almarai",
});

const zalandoSansSemiExpanded = Zalando_Sans_SemiExpanded({
    subsets: ["latin"],
    weight: ["700"],
    variable: "--font-zalando",
});

const MODAL_LABELS: ShowcaseModalLabels = {
    viewWebsite: "View website",
    overviewTab: "Overview",
    galleryTab: "Gallery",
    galleryPreview: "Gallery preview",
    tools: "Tools",
};

interface PreviewStageProps {
    input: ProjectInput;
    categoryOptions: CategoryOption[];
    toolOptions: ToolBadgeOption[];
    onClose: () => void;
}

export function PreviewStage({ input, categoryOptions, toolOptions, onClose }: PreviewStageProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("light");
    const project = toPreviewProject(input);
    const showcaseItem = toPreviewShowcaseItem(input, categoryOptions, toolOptions);
    const categoryLabel =
        categoryOptions.find((option) => input.categories.includes(option.key))?.label ?? "";

    useEffect(() => {
        const body = document.body;
        const previousTheme = body.dataset.theme;
        body.dataset.theme = theme;
        body.classList.add(almarai.variable, zalandoSansSemiExpanded.variable);

        const FONT_ALIASES: Record<string, string> = {
            "--font-body": "var(--font-almarai)",
            "--font-display": "var(--font-almarai)",
            "--font-title-accent": "var(--font-zalando)",
        };
        for (const [name, value] of Object.entries(FONT_ALIASES)) {
            body.style.setProperty(name, value);
        }

        const previousColorScheme = body.style.colorScheme;
        body.style.colorScheme = "light";

        return () => {
            if (previousTheme === undefined) delete body.dataset.theme;
            else body.dataset.theme = previousTheme;
            body.classList.remove(almarai.variable, zalandoSansSemiExpanded.variable);
            for (const name of Object.keys(FONT_ALIASES)) {
                body.style.removeProperty(name);
            }
            body.style.colorScheme = previousColorScheme;
        };
    }, [theme]);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape" && !modalOpen) onClose();
        }
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [modalOpen, onClose]);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const scrollbarWidth = window.innerWidth - html.clientWidth;

        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlPaddingRight = html.style.paddingRight;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            html.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            html.style.paddingRight = previousHtmlPaddingRight;
        };
    }, []);

    return (
        <LazyMotion features={domMax} strict>
            <div className={styles.backdrop} onClick={onClose}>
                <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.bar}>
                        <span className={styles.title}>Preview</span>
                        <div className={styles.barActions}>
                            <button
                                type="button"
                                className={styles.themeToggle}
                                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                            >
                                {theme === "dark" ? "Light theme" : "Dark theme"}
                            </button>
                            <button type="button" className={styles.closeButton} onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>

                    <div
                        className={`${styles.stage} ${almarai.variable} ${zalandoSansSemiExpanded.variable}`}
                        data-theme={theme}
                    >
                        <div className={styles.cardWrap}>
                            <WorksCard
                                project={project}
                                rank={1}
                                categoryLabel={categoryLabel}
                                viewLabel="View project"
                                onOpen={() => setModalOpen(true)}
                            />
                        </div>
                    </div>
                </div>

                <ShowcaseModal
                    item={modalOpen ? showcaseItem : null}
                    onClose={() => setModalOpen(false)}
                    labels={MODAL_LABELS}
                />
            </div>
        </LazyMotion>
    );
}
