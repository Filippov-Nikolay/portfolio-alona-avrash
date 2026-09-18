"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import type { ShowcaseItem } from "@/shared/types";
import type { CategoryKey } from "@/shared/types/category";
import type { Project } from "@/entities/project/model/project";
import type { CtaContent } from "@/entities/cta/model/cta";
import {
    getPrimaryCategory,
    groupProjectsByPrimaryCategory,
} from "@/entities/project/lib/groupProjects";
import { ArrowIcon, ArrowV2Icon, Button, Container, ShowcaseModal } from "@/shared/ui";
import type { ShowcaseModalTab } from "@/shared/ui";
import { CtaSection } from "@/widgets/CtaSection";
import { cn } from "@/shared/lib/cn";
import { usePreloader } from "@/shared/providers";
import { useMotionVariants } from "@/shared/hooks";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { reveal } from "@/shared/lib/motion/reveal";
import { useWorksCardReveal } from "./useWorksCardReveal";
import styles from "./WorksCatalog.module.scss";

const FILTER_CATEGORIES: CategoryKey[] = ["ui-ux", "branding", "logo", "packaging", "web-design"];
const FILTER_CATEGORY_SET = new Set<string>(FILTER_CATEGORIES);

type SortOrder = "latest" | "oldest";

const SORT_DROPDOWN_EASE = [0.25, 0.1, 0.25, 1] as const;
const SORT_DROPDOWN_CLOSE_EASE = [0.22, 1, 0.36, 1] as const;

const sortDropdownVariants = {
    hidden: {
        opacity: 0,
        y: -4,
        scaleY: 0.95,
        transition: { duration: 0.45, ease: SORT_DROPDOWN_CLOSE_EASE },
    },
    visible: {
        opacity: 1,
        y: 0,
        scaleY: 1,
        transition: {
            duration: 0.18,
            ease: SORT_DROPDOWN_EASE,
            staggerChildren: 0.04,
            delayChildren: 0.02,
        },
    },
};

const sortOptionVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.16, ease: SORT_DROPDOWN_EASE } },
};

const CTA_MIN_GROUP_SIZE = 3;

const FILTER_PARAM = "filter";
const SORT_PARAM = "sort";
const TAB_PARAM = "tab";
const IMAGE_PARAM = "image";

function parseFilterParam(raw: string | null): CategoryKey[] {
    if (!raw) return [];
    return raw.split(",").filter((value): value is CategoryKey => FILTER_CATEGORY_SET.has(value));
}

function parseSortParam(raw: string | null): SortOrder {
    return raw === "oldest" ? "oldest" : "latest";
}

function parseTabParam(raw: string | null): ShowcaseModalTab {
    return raw === "gallery" ? "gallery" : "overview";
}

function parseImageParam(raw: string | null, galleryLength: number): number | null {
    if (raw === null) return null;
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= galleryLength) return null;
    return index;
}

interface WorksCatalogLabels {
    title: string;
    subtitle: string;
    allFilter: string;
    sortLabel: string;
    sortLatest: string;
    sortOldest: string;
    sectionSuffix: string;
    viewProject: string;
}

interface WorksCatalogProps {
    projects: Project[];
    modalItems: ShowcaseItem[];
    categoryLabels: Record<CategoryKey, string>;
    cta: CtaContent;
    labels: WorksCatalogLabels;
    initialSelectedId?: number | null;
}

export function WorksCatalog({
    projects,
    modalItems,
    categoryLabels,
    cta,
    labels,
    initialSelectedId = null,
}: WorksCatalogProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const worksBasePath = useMemo(() => pathname.replace(/\/works(\/.*)?$/, "/works"), [pathname]);
    const { isReady } = usePreloader();
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const safeReveal = useMotionVariants(reveal);
    const registerCard = useWorksCardReveal();

    const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
        parseSortParam(searchParams.get(SORT_PARAM))
    );
    const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>(() =>
        parseFilterParam(searchParams.get(FILTER_PARAM))
    );

    const modalItemsById = useMemo(
        () => new Map(modalItems.map((item) => [item.id, item])),
        [modalItems]
    );

    const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
    const [activeTab, setActiveTab] = useState<ShowcaseModalTab>(() => {
        if (initialSelectedId === null) return "overview";
        const hasImage = searchParams.get(IMAGE_PARAM) !== null;
        return hasImage ? "gallery" : parseTabParam(searchParams.get(TAB_PARAM));
    });
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(() => {
        if (initialSelectedId === null) return null;
        const galleryLength = modalItemsById.get(initialSelectedId)?.gallery.length ?? 0;
        return parseImageParam(searchParams.get(IMAGE_PARAM), galleryLength);
    });

    const selectedItem = selectedId === null ? null : (modalItemsById.get(selectedId) ?? null);
    const selectedSlug = selectedItem?.slug ?? null;

    const openProject = useCallback((id: number) => {
        setSelectedId(id);
        setActiveTab("overview");
        setLightboxIndex(null);
    }, []);

    const closeProject = useCallback(() => {
        setSelectedId(null);
        setActiveTab("overview");
        setLightboxIndex(null);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedCategories.length > 0) params.set(FILTER_PARAM, selectedCategories.join(","));
        if (sortOrder !== "latest") params.set(SORT_PARAM, sortOrder);

        let path = worksBasePath;
        if (selectedItem) {
            path = `${worksBasePath}/${selectedItem.slug}`;
            if (activeTab !== "overview") params.set(TAB_PARAM, activeTab);
            if (lightboxIndex !== null) params.set(IMAGE_PARAM, String(lightboxIndex));
        }

        const query = params.toString();
        const url = query ? `${path}?${query}` : path;
        window.history.replaceState(window.history.state, "", url);
        // selectedItem is read for its (stable) slug - see selectedSlug above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategories, sortOrder, selectedSlug, activeTab, lightboxIndex, worksBasePath]);

    const toggleCategory = useCallback((key: CategoryKey) => {
        setSelectedCategories((prev) =>
            prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]
        );
    }, []);

    const clearCategories = useCallback(() => {
        setSelectedCategories([]);
    }, []);

    const sortedProjects = useMemo(() => {
        const sign = sortOrder === "latest" ? -1 : 1;
        return [...projects].sort(
            (a, b) => sign * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
    }, [projects, sortOrder]);

    const visibleProjects = useMemo(
        () =>
            selectedCategories.length === 0
                ? sortedProjects
                : sortedProjects.filter((project) =>
                      selectedCategories.includes(getPrimaryCategory(project.categories))
                  ),
        [sortedProjects, selectedCategories]
    );

    const groups = useMemo(
        () => groupProjectsByPrimaryCategory(visibleProjects),
        [visibleProjects]
    );

    // The very first card on the page sits above the reveal effect's own
    // "settled" line before any scrolling happens at all, so it would
    // render blurred on load - which reads as broken, not intentional.
    // It's exempt from the reveal entirely and always shows sharp.
    const firstCardId = groups[0]?.projects[0]?.id;

    const sortOptions: { value: SortOrder; label: string }[] = [
        { value: "latest", label: labels.sortLatest },
        { value: "oldest", label: labels.sortOldest },
    ];

    return (
        <Container className={styles.container}>
            <m.div variants={safeStagger} initial="hidden" animate={isReady ? "visible" : "hidden"}>
                <m.header className={styles.pageHeader} variants={safeReveal}>
                    <h1 className={styles.pageTitle}>{labels.title}</h1>
                    <p className={styles.pageSubtitle}>{labels.subtitle}</p>
                </m.header>

                <m.div className={styles.controls} variants={safeFadeIn}>
                    <div className={styles.filters} role="group" aria-label={labels.sortLabel}>
                        <button
                            type="button"
                            aria-pressed={selectedCategories.length === 0}
                            className={cn(
                                styles.filterPill,
                                selectedCategories.length === 0 && styles.filterPillActive
                            )}
                            onClick={clearCategories}
                        >
                            {labels.allFilter}
                        </button>
                        {FILTER_CATEGORIES.map((key) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={selectedCategories.includes(key)}
                                className={cn(
                                    styles.filterPill,
                                    selectedCategories.includes(key) && styles.filterPillActive
                                )}
                                onClick={() => toggleCategory(key)}
                            >
                                {categoryLabels[key]}
                            </button>
                        ))}
                    </div>

                    <SortMenu
                        label={labels.sortLabel}
                        value={sortOrder}
                        options={sortOptions}
                        onChange={setSortOrder}
                    />
                </m.div>
            </m.div>

            {groups.map((group) => (
                <m.section
                    key={group.category}
                    className={styles.group}
                    variants={safeStagger}
                    initial="hidden"
                    animate={isReady ? "visible" : "hidden"}
                >
                    <m.div className={styles.sectionHeader} variants={safeFadeIn}>
                        <h2 className={styles.sectionTitle}>{categoryLabels[group.category]}</h2>
                        <span className={styles.sectionRule} aria-hidden="true" />
                        <span className={styles.sectionSuffix}>{labels.sectionSuffix}</span>
                    </m.div>

                    <m.div className={styles.list} variants={safeStagger}>
                        {group.projects.map((project, i) => (
                            <Fragment key={project.id}>
                                {i === group.projects.length - 1 &&
                                    group.projects.length > CTA_MIN_GROUP_SIZE && (
                                        <CtaSection content={cta} variant="banner" />
                                    )}
                                <m.div variants={safeReveal}>
                                    <WorksCard
                                        project={project}
                                        rank={i + 1}
                                        categoryLabel={
                                            categoryLabels[getPrimaryCategory(project.categories)]
                                        }
                                        viewLabel={labels.viewProject}
                                        onOpen={() => openProject(project.id)}
                                        cardRef={
                                            project.id === firstCardId
                                                ? undefined
                                                : registerCard(project.id)
                                        }
                                    />
                                </m.div>
                            </Fragment>
                        ))}
                    </m.div>
                </m.section>
            ))}

            <ShowcaseModal
                item={selectedItem}
                onClose={closeProject}
                initialTab={activeTab}
                onTabChange={setActiveTab}
                initialLightboxIndex={lightboxIndex}
                onLightboxChange={setLightboxIndex}
            />
        </Container>
    );
}

// == WorksCard ================================================

interface WorksCardProps {
    project: Project;
    rank: number;
    categoryLabel: string;
    viewLabel: string;
    onOpen: () => void;
    cardRef?: (el: HTMLDivElement | null) => void;
}

function WorksCard({ project, rank, categoryLabel, viewLabel, onOpen, cardRef }: WorksCardProps) {
    const heroImage = project.image.find((image) => image.isHero) ?? project.image[0];
    const year = new Date(project.createdAt).getFullYear();

    const hoverStyle = {
        "--hover-bg": project.hover.background,
        "--hover-accent": project.hover.accentColor,
        "--hover-btn-bg": project.hover.buttonBackground,
        "--hover-btn-text": project.hover.buttonTextColor,
    } as CSSProperties;

    return (
        <div ref={cardRef} className={styles.card} style={hoverStyle} onClick={onOpen}>
            <div className={styles.visual}>
                {heroImage?.src && (
                    <Image
                        src={heroImage.src}
                        alt={heroImage.alt ?? project.name}
                        fill
                        className={styles.image}
                        sizes="(max-width: 767px) 100vw, 45vw"
                    />
                )}
            </div>

            <div className={styles.info}>
                <div className={styles.infoTop}>
                    <span className={styles.rank}>{String(rank).padStart(2, "0")}</span>
                    <span className={styles.year}>{year}</span>
                </div>

                <div className={styles.infoBody}>
                    <h3 className={styles.cardTitle}>{project.name}</h3>
                    <p className={styles.cardSubtitle}>{categoryLabel}</p>
                </div>

                <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className={styles.viewBtn}
                    rightIcon={<ArrowIcon className={styles.viewArrow} />}
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen();
                    }}
                >
                    {viewLabel}
                </Button>
            </div>
        </div>
    );
}

// == SortMenu ==================================================

interface SortMenuProps {
    label: string;
    value: SortOrder;
    options: { value: SortOrder; label: string }[];
    onChange: (value: SortOrder) => void;
}

function SortMenu({ label, value, options, onChange }: SortMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const dotLayoutId = `sort-dot-${useId()}`;

    useEffect(() => {
        function onOutsideClick(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        }
        function onEscape(e: KeyboardEvent) {
            if (e.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("pointerdown", onOutsideClick);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("pointerdown", onOutsideClick);
            document.removeEventListener("keydown", onEscape);
        };
    }, []);

    const current = options.find((option) => option.value === value);

    return (
        <div ref={ref} className={styles.sortWrap}>
            <span className={styles.sortLabel}>{label}</span>

            <div className={styles.sortTriggerWrap}>
                <button
                    type="button"
                    className={cn(styles.sortTrigger, isOpen && styles.sortTriggerOpen)}
                    onClick={() => setIsOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    {current?.label}
                    <ArrowV2Icon className={styles.sortChevron} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <m.ul
                            className={styles.sortDropdown}
                            role="listbox"
                            variants={sortDropdownVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            style={{ transformOrigin: "top" }}
                        >
                            {options.map((option) => (
                                <m.li
                                    key={option.value}
                                    role="option"
                                    aria-selected={option.value === value}
                                    variants={sortOptionVariants}
                                >
                                    <button
                                        type="button"
                                        className={cn(
                                            styles.sortOption,
                                            option.value === value && styles.sortOptionActive
                                        )}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                    >
                                        {option.value === value && (
                                            <m.span
                                                layoutId={dotLayoutId}
                                                className={styles.sortOptionDot}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 32,
                                                }}
                                            />
                                        )}
                                        {option.label}
                                    </button>
                                </m.li>
                            ))}
                        </m.ul>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
