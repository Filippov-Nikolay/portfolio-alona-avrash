"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import useEmblaCarousel from "embla-carousel-react";
import { useInView } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { scrollToElementId } from "@/shared/lib/scroll";
import { usePreloader, useThemeContext } from "@/shared/providers";
import type { ShowcaseItem, ShowcaseCarouselI18n } from "@/shared/types";
import { Section, ArrowIcon, ShowcaseModal } from "@/shared/ui";
import { ShowcaseCard } from "./components/ShowcaseCard";
import styles from "./ShowcaseSection.module.scss";

const AUTO_PLAY_MS = 4500;
const AUTO_PLAY_DEFAULT = false;

// Embla can only loop when the content size is large enough relative to the
// viewport. Three copies keeps the desktop carousel loop stable while the real
// item mapping stays simple via idx % N.
const COPIES = 3;

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

// Apply scale + opacity to each slide's inner wrapper on every Embla scroll
// frame. Accepts pre-cached node refs and snap list to avoid any DOM queries
// or Embla API traversals during the hot animation path.
function applyTweens(
    progress: number,
    snaps: number[],
    innerNodes: (HTMLElement | null)[],
    useOpacityTween: boolean
) {
    snaps.forEach((snapPos, i) => {
        let diff = snapPos - progress;
        if (diff < -0.5) diff += 1;
        if (diff > 0.5) diff -= 1;

        const dist = Math.min(Math.abs(diff) * snaps.length, 2);
        const scale = mapRange(dist, [0, 0.5, 1, 2], [1, 0.95, 0.88, 0.76]);
        const opacity = mapRange(dist, [0, 0.5, 1, 2], [1, 0.82, 0.58, 0.22]);

        const inner = innerNodes[i];
        if (inner) {
            inner.style.transform = `scale(${scale})`;
            inner.style.opacity = "1";
            inner.style.filter = useOpacityTween ? `brightness(${opacity})` : "";
        }
    });
}

interface ShowcaseSectionProps {
    initialItems: ShowcaseItem[];
    initialFeaturedIndex: number;
    initialLabels: ShowcaseCarouselI18n;
    autoPlay?: boolean;
}

export function ShowcaseSection({
    initialItems,
    initialFeaturedIndex,
    initialLabels,
    autoPlay = AUTO_PLAY_DEFAULT,
}: ShowcaseSectionProps) {
    const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);
    const items = initialItems;
    const featuredIndex = initialFeaturedIndex;

    const viewLabel = initialLabels.viewSource;
    const moreLabel = initialLabels.more;
    const moreSubDesc = initialLabels.moreDesc;

    return (
        <Section id="highlights" className={styles.section}>
            <h2 className={styles.srOnly}>Highlights</h2>
            <Carousel
                items={items}
                viewLabel={viewLabel}
                moreLabel={moreLabel}
                moreSubDesc={moreSubDesc}
                autoPlay={autoPlay}
                initialIndex={featuredIndex}
                onOpen={setSelectedItem}
            />
            <ShowcaseModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                viewLabel={viewLabel}
            />
        </Section>
    );
}

interface CarouselProps {
    items: ShowcaseItem[];
    viewLabel: string;
    moreLabel: string;
    moreSubDesc: string;
    autoPlay?: boolean;
    initialIndex?: number;
    onOpen: (item: ShowcaseItem) => void;
}

function Carousel({
    items,
    viewLabel,
    moreLabel,
    moreSubDesc,
    autoPlay = false,
    initialIndex = 0,
    onOpen,
}: CarouselProps) {
    const totalItems = items.length;
    const totalSlots = totalItems + 1;
    const nullPos = totalItems;
    const slideDeck = useMemo<(ShowcaseItem | null)[]>(() => {
        const copy: (ShowcaseItem | null)[] = [...items, null];
        return Array.from({ length: COPIES }, () => copy).flat();
    }, [items]);
    const middleStartIndex = totalSlots + initialIndex;

    const { isReady } = usePreloader();
    const { theme } = useThemeContext();
    const isLightTheme = theme === "light";
    const emblaPlugins = useMemo(
        () => [WheelGesturesPlugin({ wheelDraggingClass: styles.wheelDragging })],
        []
    );
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            align: "center",
            startIndex: middleStartIndex,
        },
        emblaPlugins
    );

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inViewRaw = useInView(wrapperRef, { once: true, amount: 0.15 });
    const inView = inViewRaw && isReady;

    const [selectedIndex, setSelectedIndex] = useState(middleStartIndex);
    const slideIndex = selectedIndex % totalSlots;
    const isMoreActive = slideIndex === nullPos;
    // For dots: map deck position back to item array index
    const realIndex = isMoreActive
        ? nullPos - 1 // keep last item's dot lit
        : slideIndex < nullPos
          ? slideIndex
          : slideIndex - 1;

    const scrollToGallery = useCallback(() => {
        scrollToElementId("showcase", { offset: 100 });
    }, []);

    const dragStartX = useRef(0);
    const isDragging = useRef(false);

    // Cached refs — populated once on init/reInit so applyTweens never
    // calls querySelector or slideNodes() during the scroll hot-path.
    const innerNodesRef = useRef<(HTMLElement | null)[]>([]);
    const snapListRef = useRef<number[]>([]);

    const runTweens = useCallback(() => {
        if (!emblaApi) return;
        applyTweens(
            emblaApi.scrollProgress(),
            snapListRef.current,
            innerNodesRef.current,
            !isLightTheme
        );
    }, [emblaApi, isLightTheme]);

    useEffect(() => {
        if (!emblaApi) return;
        const api = emblaApi;

        const buildCache = () => {
            snapListRef.current = api.scrollSnapList();
            innerNodesRef.current = api
                .slideNodes()
                .map((slide) => slide.querySelector<HTMLElement>(`.${styles.slotInner}`));
        };

        const onSettle = () => {
            setSelectedIndex(api.selectedScrollSnap());
        };

        buildCache();
        api.on("scroll", runTweens);
        api.on("settle", runTweens);
        api.on("settle", onSettle);
        api.on("reInit", buildCache);
        api.on("reInit", runTweens);

        runTweens();
        requestAnimationFrame(runTweens);

        return () => {
            api.off("scroll", runTweens);
            api.off("settle", runTweens);
            api.off("settle", onSettle);
            api.off("reInit", buildCache);
            api.off("reInit", runTweens);
        };
    }, [emblaApi, runTweens]);

    useEffect(() => {
        if (!autoPlay || !emblaApi) return;
        const id = setInterval(() => emblaApi.scrollNext(), AUTO_PLAY_MS);
        return () => clearInterval(id);
    }, [autoPlay, emblaApi]);

    useEffect(() => {
        runTweens();
    }, [runTweens]);

    const handleSlideClick = useCallback(
        (e: React.MouseEvent, index: number) => {
            if ((e.target as HTMLElement).closest("a")) return;
            const api = emblaApi;
            if (!api || isDragging.current) return;

            if (api.selectedScrollSnap() === index) {
                // Use slideDeck to identify the item — avoids index math
                const item = slideDeck[index];
                if (item === null) {
                    scrollToGallery();
                } else {
                    onOpen(item);
                }
            } else {
                api.scrollTo(index);
            }
        },
        [emblaApi, onOpen, scrollToGallery, slideDeck]
    );

    return (
        <div ref={wrapperRef}>
            <div
                className={styles.viewport}
                ref={emblaRef}
                tabIndex={0}
                role="region"
                aria-label="Highlights carousel"
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
                                className={cn(
                                    styles.slideEntrance,
                                    inView && styles.slideVisible,
                                    inView && i === middleStartIndex && styles.slideNoFade
                                )}
                                style={{
                                    transitionDelay: `${Math.min(Math.abs(i - middleStartIndex) * 0.055, 0.25)}s`,
                                }}
                            >
                                <div className={styles.slotInner}>
                                    <div
                                        className={styles.hoverWrap}
                                        aria-hidden={i !== selectedIndex ? true : undefined}
                                    >
                                        {item === null ? (
                                            <MoreCard
                                                isActive={
                                                    isMoreActive && i % totalSlots === nullPos
                                                }
                                                label={moreLabel}
                                                desc={moreSubDesc}
                                            />
                                        ) : (
                                            <ShowcaseCard
                                                item={item}
                                                isActive={
                                                    !isMoreActive && i % totalSlots === slideIndex
                                                }
                                                focusable={i === selectedIndex}
                                                viewLabel={viewLabel}
                                                priority={i % totalSlots === initialIndex}
                                                loading="eager"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.dots} role="tablist" aria-label="Highlights">
                {items.map((item, i) => (
                    <button
                        key={item.id}
                        role="tab"
                        aria-selected={!isMoreActive && realIndex === i}
                        aria-label={`Go to ${item.title}`}
                        className={cn(
                            styles.dot,
                            !isMoreActive && realIndex === i && styles.dotActive
                        )}
                        onClick={() => emblaApi?.scrollTo(totalSlots + i)}
                    />
                ))}
            </div>
        </div>
    );
}

// == MoreCard ====================================================

interface MoreCardProps {
    isActive?: boolean;
    label: string;
    desc: string;
}

function MoreCard({ isActive, label, desc }: MoreCardProps) {
    return (
        <article
            className={cn(styles.moreCard, isActive && styles.moreCardActive)}
            aria-label={label}
        >
            {/* Subtle grid overlay */}
            <div className={styles.moreGrid} aria-hidden="true" />

            {/* Center content */}
            <div className={styles.moreInner}>
                {/* Bouncing arrow circle */}
                <div className={styles.moreArrowWrap} aria-hidden="true">
                    <span className={styles.moreArrowCircle}>
                        <ArrowIcon className={styles.moreArrowIcon} />
                    </span>
                </div>

                {/* Text */}
                <div className={styles.moreTextWrap}>
                    <h3 className={styles.moreTitle}>{label}</h3>
                    <p className={styles.moreSubtitle}>{desc}</p>
                </div>
            </div>
        </article>
    );
}
