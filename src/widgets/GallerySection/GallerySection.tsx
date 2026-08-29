"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { useInView } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { usePreloader } from "@/shared/providers";
import type { ShowcaseItem, GalleryI18n } from "@/shared/types";
import {
    Container,
    Section,
    Button,
    Tag,
    GitHubIcon,
    ArrowIcon,
    ExternalLinkIcon,
    FolderIcon,
    ShowcaseModal,
} from "@/shared/ui";
import { ACCENT_COLORS } from "@/shared/constants/colors";
import { useGallerySectionAnimations } from "./useGallerySectionAnimations";
import styles from "./GallerySection.module.scss";

const COPIES = 3;

function initials(title: string): string {
    return title
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

// Linear interpolation across a 4-point range (mirrors ShowcaseSection)
function mapRange(
    value: number,
    input: [number, number, number, number],
    output: [number, number, number, number]
): number {
    const v = Math.max(input[0], Math.min(input[3], value));
    for (let i = 1; i < input.length; i++) {
        if (v <= input[i]) {
            const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
            return output[i - 1] + t * (output[i] - output[i - 1]);
        }
    }
    return output[3];
}

function applyTweens(progress: number, snaps: number[], innerNodes: (HTMLElement | null)[]) {
    snaps.forEach((snapPos, i) => {
        let diff = snapPos - progress;
        if (diff < -0.5) diff += 1;
        if (diff > 0.5) diff -= 1;

        const dist = Math.min(Math.abs(diff) * snaps.length, 2);
        // No scale — all cards keep the same height.
        // Only opacity dims non-center cards.
        const opacity = mapRange(dist, [0, 0.5, 1, 2], [1, 0.82, 0.55, 0.25]);

        const inner = innerNodes[i];
        if (inner) {
            inner.style.transform = "scale(1)";
            inner.style.opacity = String(opacity);
        }
    });
}

// == Main section ==============================================

interface GallerySectionProps {
    initialItems: ShowcaseItem[];
    initialLabels: GalleryI18n;
    collectionUrl: string;
}

export function GallerySection({
    initialItems,
    initialLabels,
    collectionUrl,
}: GallerySectionProps) {
    const { isReady } = usePreloader();

    const {
        sectionRef,
        headerRef,
        terminalWrapRef,
        subtitleRef,
        featuredRef,
        carouselRef,
        moreRef,
    } = useGallerySectionAnimations(isReady);

    // `visible` is used only for the carousel slide-entrance CSS transitions
    const inViewRaw = useInView(sectionRef, { once: true, amount: 0.05 });
    const visible = inViewRaw && isReady;

    const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);

    const featuredItem = initialItems.find((item) => item.featured) ?? initialItems[0];
    const otherItems = initialItems.filter((item) => item.id !== featuredItem?.id);

    if (!featuredItem) return null;

    const featuredColor = ACCENT_COLORS[featuredItem.color ?? "purple"];
    const featuredMono = initials(featuredItem.title);

    return (
        <Section id="showcase" className={styles.section}>
            <div ref={sectionRef}>
                {/* == Header + Featured == inside Container == */}
                <Container>
                    <div ref={headerRef} className={styles.header}>
                        <div ref={terminalWrapRef} className={styles.terminalWrap}>
                            <span className={styles.prompt} aria-hidden="true">
                                &gt;
                            </span>
                            <h2 className={styles.terminalTitle}>
                                SHOWCASE
                                <span className={styles.cursor} aria-hidden="true">
                                    _
                                </span>
                            </h2>
                        </div>
                        <p ref={subtitleRef} className={styles.subtitle}>
                            {initialLabels.subtitle}
                        </p>
                    </div>

                    <div
                        ref={featuredRef}
                        className={styles.featured}
                        style={
                            {
                                "--c-hex": featuredColor.hex,
                                "--c-a08": featuredColor.a08,
                                "--c-a12": featuredColor.a12,
                                "--c-a14": featuredColor.a14,
                                "--c-a18": featuredColor.a18,
                                "--c-a22": featuredColor.a22,
                            } as React.CSSProperties
                        }
                        onClick={(e) => {
                            if ((e.target as HTMLElement).closest("a")) return;
                            setSelectedItem(featuredItem);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${featuredItem.title} details`}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedItem(featuredItem);
                            }
                        }}
                    >
                        <div className={styles.featuredVisual} aria-hidden="true">
                            <div className={styles.featuredGlow} />
                            {featuredItem.src ? (
                                <Image
                                    src={featuredItem.src}
                                    alt=""
                                    fill
                                    className={styles.featuredImage}
                                    sizes="(max-width: 768px) 100vw, 600px"
                                    draggable={false}
                                />
                            ) : (
                                <>
                                    <div className={styles.featuredRing} />
                                    <span className={styles.featuredMono}>{featuredMono}</span>
                                </>
                            )}
                            <div className={styles.featuredGrid} />
                        </div>

                        <div className={styles.featuredContent}>
                            <span className={styles.featuredLabel}>{initialLabels.featured}</span>
                            <h3 className={styles.featuredTitle}>{featuredItem.title}</h3>

                            {featuredItem.tags.length > 0 && (
                                <div className={styles.featuredTags}>
                                    {featuredItem.tags.slice(0, 5).map((tag) => (
                                        <Tag key={tag}>{tag}</Tag>
                                    ))}
                                </div>
                            )}

                            {featuredItem.description && (
                                <p className={styles.featuredDesc}>{featuredItem.description}</p>
                            )}

                            <div className={styles.featuredActions}>
                                {featuredItem.href && (
                                    <Button
                                        as="a"
                                        href={featuredItem.href}
                                        variant="outline"
                                        size="sm"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        leftIcon={<ArrowIcon className={styles.externalIcon} />}
                                    >
                                        {initialLabels.primaryAction}
                                    </Button>
                                )}
                                {featuredItem.secondaryHref && (
                                    <Button
                                        as="a"
                                        href={featuredItem.secondaryHref}
                                        variant="outline"
                                        size="sm"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        leftIcon={<GitHubIcon className={styles.githubIcon} />}
                                    >
                                        {initialLabels.secondaryAction}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </Container>

                {/* == Full-width carousel == no Container == */}
                {otherItems.length > 0 && (
                    <div ref={carouselRef}>
                        <SmallCarousel
                            items={otherItems}
                            visible={visible}
                            onOpen={setSelectedItem}
                        />
                    </div>
                )}

                {/* == More items == inside Container == */}
                <Container>
                    <a
                        ref={moreRef}
                        href={collectionUrl}
                        className={styles.moreProjects}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <div className={styles.moreLeft}>
                            <span className={styles.moreIconBox} aria-hidden="true">
                                <FolderIcon className={styles.moreIcon} />
                            </span>
                            <span className={styles.moreTitle}>{initialLabels.more}</span>
                            <span className={styles.moreDesc}>{initialLabels.moreDesc}</span>
                        </div>
                        <ExternalLinkIcon className={styles.moreArrow} />
                    </a>
                </Container>
            </div>

            {/* == Modal (portal → <body>) == */}
            <ShowcaseModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                viewLabel={initialLabels.viewSource}
            />
        </Section>
    );
}

// == SmallCarousel =============================================

interface SmallCarouselProps {
    items: ShowcaseItem[];
    visible: boolean;
    onOpen: (item: ShowcaseItem) => void;
}

function SmallCarousel({ items, visible, onOpen }: SmallCarouselProps) {
    const totalItems = items.length;

    const slideDeck = useMemo<ShowcaseItem[]>(
        () => Array.from({ length: COPIES }, () => items).flat(),
        [items]
    );
    const middleStartIndex = totalItems;

    const emblaPlugins = useMemo(
        () => [WheelGesturesPlugin({ wheelDraggingClass: styles.wheelDragging })],
        []
    );
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            align: "center", // active card is always centered
            startIndex: middleStartIndex,
        },
        emblaPlugins
    );

    const [selectedIndex, setSelectedIndex] = useState(middleStartIndex);

    const dragStartX = useRef(0);
    const isDragging = useRef(false);

    // Cached refs for the tween hot-path
    const innerNodesRef = useRef<(HTMLElement | null)[]>([]);
    const snapListRef = useRef<number[]>([]);

    const runTweens = useCallback(() => {
        if (!emblaApi) return;
        applyTweens(emblaApi.scrollProgress(), snapListRef.current, innerNodesRef.current);
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        const api = emblaApi;

        const buildCache = () => {
            snapListRef.current = api.scrollSnapList();
            innerNodesRef.current = api
                .slideNodes()
                .map((slide) => slide.querySelector<HTMLElement>(`.${styles.slotInner}`));
        };

        const update = () => setSelectedIndex(api.selectedScrollSnap());

        buildCache();
        update();

        api.on("scroll", runTweens);
        api.on("settle", runTweens);
        api.on("select", update);
        api.on("settle", update);
        api.on("reInit", buildCache);
        api.on("reInit", runTweens);
        api.on("reInit", update);

        requestAnimationFrame(runTweens);

        return () => {
            api.off("scroll", runTweens);
            api.off("settle", runTweens);
            api.off("select", update);
            api.off("settle", update);
            api.off("reInit", buildCache);
            api.off("reInit", runTweens);
            api.off("reInit", update);
        };
    }, [emblaApi, runTweens]);

    const handleSlideClick = useCallback(
        (e: React.MouseEvent, index: number) => {
            if ((e.target as HTMLElement).closest("a")) return;
            const api = emblaApi;
            if (!api || isDragging.current) return;

            const snap = api.selectedScrollSnap();
            if (snap === index) {
                // Center card clicked — open modal
                onOpen(items[snap % totalItems]);
            } else {
                api.scrollTo(index);
            }
        },
        [emblaApi, onOpen, items, totalItems]
    );

    return (
        <div className={styles.carouselSection}>
            <div
                className={styles.viewport}
                ref={emblaRef}
                tabIndex={0}
                role="region"
                aria-label="Gallery carousel"
                onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        emblaApi?.scrollPrev();
                    }
                    if (e.key === "ArrowRight") {
                        e.preventDefault();
                        emblaApi?.scrollNext();
                    }
                }}
                onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    dragStartX.current = e.clientX;
                    isDragging.current = false;
                }}
                onPointerUp={(e) => {
                    if (Math.abs(e.clientX - dragStartX.current) > 5) {
                        isDragging.current = true;
                        setTimeout(() => {
                            isDragging.current = false;
                        }, 0);
                    }
                }}
            >
                <div className={styles.track}>
                    {slideDeck.map((item, i) => (
                        <div
                            key={i}
                            className={styles.slot}
                            onClick={(e) => handleSlideClick(e, i)}
                        >
                            <div
                                className={cn(styles.slideEntrance, visible && styles.slideVisible)}
                                style={{
                                    transitionDelay: `${Math.min(Math.abs(i - middleStartIndex) * 0.06, 0.22)}s`,
                                }}
                            >
                                {/* slotInner receives scale+opacity tweens via direct DOM */}
                                <div className={styles.slotInner}>
                                    <div
                                        className={styles.hoverWrap}
                                        aria-hidden={i !== selectedIndex ? true : undefined}
                                    >
                                        <SmallCard item={item} isActive={i === selectedIndex} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// == SmallCard =================================================

interface SmallCardProps {
    item: ShowcaseItem;
    isActive?: boolean;
}

function SmallCard({ item, isActive }: SmallCardProps) {
    const color = ACCENT_COLORS[item.color ?? "purple"];
    const mono = initials(item.title);

    return (
        <article
            className={cn(styles.smallCard, isActive && styles.smallCardActive)}
            style={
                {
                    "--c-hex": color.hex,
                    "--c-a08": color.a08,
                    "--c-a12": color.a12,
                    "--c-a14": color.a14,
                    "--c-a18": color.a18,
                    "--c-a22": color.a22,
                } as React.CSSProperties
            }
            aria-label={item.title}
        >
            <div className={styles.smallVisual} aria-hidden="true">
                <div className={styles.smallGlow} />
                {item.src ? (
                    <Image
                        src={item.src}
                        alt=""
                        fill
                        className={styles.smallImage}
                        sizes="(max-width: 480px) 280px, 300px"
                        draggable={false}
                    />
                ) : (
                    <span className={styles.smallMono}>{mono}</span>
                )}
                <div className={styles.smallGrid} />
            </div>

            <div className={styles.smallFooter}>
                <div className={styles.smallInfo}>
                    <span className={styles.smallTitle}>{item.title}</span>
                    {item.tags.length > 0 && (
                        <div className={styles.smallTags}>
                            {item.tags.slice(0, 3).map((tag, i, arr) => (
                                <span key={tag} className={styles.smallTag}>
                                    {tag}
                                    {i < arr.length - 1 && (
                                        <span className={styles.smallTagSep}> ·</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {item.secondaryHref && (
                    <a
                        href={item.secondaryHref}
                        className={styles.smallArrowBox}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View source for ${item.title}`}
                        onClick={(e) => e.stopPropagation()}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        <ExternalLinkIcon className={styles.smallArrow} />
                    </a>
                )}
            </div>
        </article>
    );
}
