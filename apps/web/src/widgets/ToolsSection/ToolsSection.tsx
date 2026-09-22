"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent,
} from "react";
import Image from "next/image";
import type { Tool } from "@avrash/content-schema";
import { Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import styles from "./ToolsSection.module.scss";
import { Card } from "./components/Card/Card";
import { peekBlendSrc, peekStyle } from "./lib/peek";
import { useToolsSectionAnimations } from "./useToolsSectionAnimations";

interface ToolsSectionLabels {
    title: string;
    description: string;
}

interface ToolsSectionProps {
    tools: Tool[];
    labels: ToolsSectionLabels;
}

const AUTO_SCROLL_SPEED = 100;
const AUTO_SCROLL_RESUME_DELAY = 1_500;
const MARQUEE_CYCLES = 4;
const PEEK_IMAGE_SIZE = 264;
const PEEK_IMAGE_QUALITY = 72;
const AUTO_SCROLL_VISIBILITY_MARGIN = "200px 0px";

export function ToolsSection({ tools, labels }: ToolsSectionProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [pinnedId, setPinnedId] = useState<number | null>(null);
    const [overlayTool, setOverlayTool] = useState<Tool | null>(null);
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [readyPeekImages, setReadyPeekImages] = useState<Set<string>>(() => new Set());
    const pointerTypeRef = useRef<string>("mouse");
    const { sectionRef, titleRef, descriptionRef, trackRef } = useToolsSectionAnimations();
    const sequenceRef = useRef<HTMLDivElement>(null);
    const peekOverlayRef = useRef<HTMLDivElement>(null);
    const activeCardElRef = useRef<HTMLButtonElement | null>(null);
    const dragRef = useRef({
        active: false,
        startX: 0,
        scrollLeft: 0,
        didDrag: false,
        pointerType: "mouse",
    });
    const isTrackHoveredRef = useRef(false);
    const pauseAutoScrollRef = useRef<() => void>(() => undefined);
    const activeId = hoveredId ?? pinnedId;
    const isPeeking = activeId !== null;
    const peekSources = useMemo(
        () =>
            Array.from(
                new Set(
                    tools.flatMap((tool) => tool.images.map((image) => peekBlendSrc(image.src)))
                )
            ),
        [tools]
    );
    const overlayImagesReady =
        overlayTool?.images.every((image) => readyPeekImages.has(peekBlendSrc(image.src))) ?? false;

    const markPeekImageReady = useCallback((src: string) => {
        setReadyPeekImages((current) => {
            if (current.has(src)) return current;

            const next = new Set(current);
            next.add(src);
            return next;
        });
    }, []);

    useLayoutEffect(() => {
        const track = trackRef.current;
        const sequence = sequenceRef.current;
        if (!track || !sequence) return;

        track.scrollLeft = sequence.offsetWidth;
    }, [tools.length, trackRef]);

    useEffect(() => {
        const section = sectionRef.current;
        const track = trackRef.current;
        const sequence = sequenceRef.current;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!section || !track || !sequence || reduceMotion.matches) return;

        let animationFrameId = 0;
        let resumeTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let isPaused = false;
        let isSectionVisible = false;
        let previousTimestamp = 0;
        let autoScrollPosition = track.scrollLeft;

        const pauseAutoScroll = () => {
            isPaused = true;
            previousTimestamp = 0;

            if (resumeTimeoutId) {
                clearTimeout(resumeTimeoutId);
            }

            resumeTimeoutId = setTimeout(() => {
                autoScrollPosition = track.scrollLeft;
                isPaused = false;
            }, AUTO_SCROLL_RESUME_DELAY);
        };

        const stopAnimation = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
            }
            previousTimestamp = 0;
        };

        const animate = (timestamp: number) => {
            animationFrameId = 0;
            if (!isSectionVisible || document.visibilityState !== "visible") {
                previousTimestamp = 0;
                return;
            }

            if (!isPaused && !dragRef.current.active && !isTrackHoveredRef.current) {
                const elapsed = previousTimestamp ? timestamp - previousTimestamp : 0;
                const loopWidth = sequence.offsetWidth;

                if (loopWidth > 0 && elapsed > 0) {
                    if (track.scrollLeft >= loopWidth * 2) {
                        track.scrollLeft -= loopWidth;
                        autoScrollPosition = track.scrollLeft;
                    }

                    const nextScrollLeft =
                        autoScrollPosition + (AUTO_SCROLL_SPEED * elapsed) / 1000;

                    autoScrollPosition =
                        nextScrollLeft >= loopWidth * 2
                            ? nextScrollLeft - loopWidth
                            : nextScrollLeft;
                    track.scrollLeft = autoScrollPosition;
                }
            }

            previousTimestamp = timestamp;
            animationFrameId = requestAnimationFrame(animate);
        };

        const startAnimation = () => {
            if (animationFrameId || !isSectionVisible || document.visibilityState !== "visible") {
                return;
            }

            autoScrollPosition = track.scrollLeft;
            previousTimestamp = 0;
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                startAnimation();
            } else {
                stopAnimation();
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                isSectionVisible = entry.isIntersecting;

                if (isSectionVisible) {
                    startAnimation();
                } else {
                    stopAnimation();
                }
            },
            { rootMargin: AUTO_SCROLL_VISIBILITY_MARGIN }
        );

        pauseAutoScrollRef.current = pauseAutoScroll;
        document.addEventListener("visibilitychange", handleVisibilityChange);
        observer.observe(section);

        return () => {
            pauseAutoScrollRef.current = () => undefined;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            observer.disconnect();
            stopAnimation();

            if (resumeTimeoutId) {
                clearTimeout(resumeTimeoutId);
            }
        };
    }, [sectionRef, tools.length, trackRef]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const handleWheel = (event: globalThis.WheelEvent) => {
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                pauseAutoScrollRef.current();
                return;
            }

            event.preventDefault();

            const pixelsPerLine = 16;
            const delta =
                event.deltaMode === 1
                    ? event.deltaY * pixelsPerLine
                    : event.deltaMode === 2
                      ? event.deltaY * window.innerHeight
                      : event.deltaY;
            window.scrollBy(0, delta);
        };

        track.addEventListener("wheel", handleWheel, { passive: false });
        return () => track.removeEventListener("wheel", handleWheel);
    }, [trackRef]);

    const [lastActiveId, setLastActiveId] = useState<number | null>(null);
    if (activeId !== lastActiveId) {
        setLastActiveId(activeId);
        setIsOverlayActive(false);
        if (activeId !== null) {
            setOverlayTool(tools.find((tool) => tool.id === activeId) ?? null);
        }
    }

    useLayoutEffect(() => {
        if (!isPeeking || !overlayImagesReady) return;

        const frameId = requestAnimationFrame(() => {
            setIsOverlayActive(true);
        });

        return () => cancelAnimationFrame(frameId);
    }, [activeId, isPeeking, overlayImagesReady]);

    useLayoutEffect(() => {
        if (!isPeeking) return;

        let frameId = 0;
        const syncRect = () => {
            const card = activeCardElRef.current;
            const section = sectionRef.current;
            const overlay = peekOverlayRef.current;
            if (card && section && overlay) {
                const cardRect = card.getBoundingClientRect();
                const sectionRect = section.getBoundingClientRect();
                overlay.style.setProperty(
                    "--overlay-left",
                    `${cardRect.left - sectionRect.left}px`
                );
                overlay.style.setProperty("--overlay-top", `${cardRect.top - sectionRect.top}px`);
                overlay.style.setProperty("--overlay-width", `${cardRect.width}px`);
                overlay.style.setProperty("--overlay-height", `${cardRect.height}px`);
            }
            frameId = requestAnimationFrame(syncRect);
        };
        syncRect();

        return () => cancelAnimationFrame(frameId);
    }, [isPeeking, sectionRef]);

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        pauseAutoScrollRef.current();
        const track = event.currentTarget;
        dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: track.scrollLeft,
            didDrag: false,
            pointerType: event.pointerType,
        };

        if (event.pointerType === "mouse") {
            track.setPointerCapture(event.pointerId);
        }
    }

    function drag(event: PointerEvent<HTMLDivElement>) {
        const state = dragRef.current;
        if (!state.active) return;

        const deltaX = event.clientX - state.startX;
        if (Math.abs(deltaX) > 3) {
            state.didDrag = true;
            pauseAutoScrollRef.current();
        }

        if (state.pointerType !== "mouse") return;

        event.currentTarget.scrollLeft = state.scrollLeft - deltaX;
    }

    function endDrag(event: PointerEvent<HTMLDivElement>) {
        if (!dragRef.current.active) return;

        const state = dragRef.current;
        state.active = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pauseAutoScrollRef.current();
    }

    function cancelDrag(event: PointerEvent<HTMLDivElement>) {
        if (!dragRef.current.active) return;

        dragRef.current.active = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pauseAutoScrollRef.current();
    }

    function pauseOnTrackHover(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType !== "mouse") return;

        isTrackHoveredRef.current = true;
        pauseAutoScrollRef.current();
    }

    function resumeAfterTrackHover(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType !== "mouse") return;

        isTrackHoveredRef.current = false;
        pauseAutoScrollRef.current();
    }

    if (tools.length === 0) {
        return null;
    }

    return (
        <Section id="tools" ref={sectionRef} className={styles.section}>
            <Container className={styles.header}>
                <h2 ref={titleRef} className={styles.title}>
                    {labels.title}
                </h2>
                <p ref={descriptionRef} className={styles.description}>
                    {labels.description}
                </p>
            </Container>

            <div
                ref={trackRef}
                className={styles.track}
                data-tools-track
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onPointerCancel={cancelDrag}
                onPointerEnter={pauseOnTrackHover}
                onPointerLeave={resumeAfterTrackHover}
            >
                <div className={styles.marquee}>
                    {Array.from({ length: MARQUEE_CYCLES }, (_, cycle) => (
                        <div
                            key={cycle}
                            ref={cycle === 0 ? sequenceRef : undefined}
                            className={styles.sequence}
                            aria-hidden={cycle !== 1}
                        >
                            {tools.map((tool) => (
                                <Card
                                    key={`${cycle}-${tool.id}`}
                                    tool={tool}
                                    isActive={activeId === tool.id}
                                    tabIndex={cycle !== 1 ? -1 : undefined}
                                    onPointerEnter={(event) => {
                                        if (event.pointerType !== "mouse") return;
                                        activeCardElRef.current = event.currentTarget;
                                        setHoveredId(tool.id);
                                    }}
                                    onPointerLeave={(event) => {
                                        if (event.pointerType === "mouse") setHoveredId(null);
                                    }}
                                    onPointerDown={(event) => {
                                        pointerTypeRef.current = event.pointerType;
                                    }}
                                    onClick={(event) => {
                                        if (dragRef.current.didDrag) {
                                            dragRef.current.didDrag = false;
                                            return;
                                        }

                                        if (pointerTypeRef.current !== "mouse") {
                                            activeCardElRef.current = event.currentTarget;
                                            setPinnedId((current) =>
                                                current === tool.id ? null : tool.id
                                            );
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.peekPreloader} data-tools-peek-preloader aria-hidden="true">
                {peekSources.map((src) => (
                    <Image
                        key={src}
                        src={src}
                        alt=""
                        width={PEEK_IMAGE_SIZE}
                        height={PEEK_IMAGE_SIZE}
                        sizes={`${PEEK_IMAGE_SIZE}px`}
                        quality={PEEK_IMAGE_QUALITY}
                        loading="lazy"
                        fetchPriority="low"
                        className={styles.peekPreloaderImage}
                        onLoad={() => markPeekImageReady(src)}
                        onError={() => markPeekImageReady(src)}
                    />
                ))}
            </div>

            {overlayTool && (
                <div
                    ref={peekOverlayRef}
                    className={cn(styles.peekOverlay, isOverlayActive && styles.peekOverlayActive)}
                    data-tools-peek-overlay
                    data-active={isOverlayActive || undefined}
                    aria-hidden="true"
                >
                    {overlayTool.images.map((image, index) => {
                        const src = peekBlendSrc(image.src);

                        return (
                            <span
                                key={image.src}
                                className={styles.cardItem}
                                style={peekStyle(index)}
                            >
                                <Image
                                    src={src}
                                    alt=""
                                    width={PEEK_IMAGE_SIZE}
                                    height={PEEK_IMAGE_SIZE}
                                    sizes={`${PEEK_IMAGE_SIZE}px`}
                                    quality={PEEK_IMAGE_QUALITY}
                                    className={styles.cardItemImg}
                                    onLoad={() => markPeekImageReady(src)}
                                    onError={() => markPeekImageReady(src)}
                                    draggable={false}
                                />
                            </span>
                        );
                    })}
                </div>
            )}
        </Section>
    );
}
