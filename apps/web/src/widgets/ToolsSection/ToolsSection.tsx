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
import {
    TOOLS_REVEAL_COMPLETE_EVENT,
    useToolsSectionAnimations,
} from "./useToolsSectionAnimations";

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
const PAGE_SCROLL_RESUME_DELAY = 220;
const SCROLL_IDLE_DELAY = 180;
const PROGRAMMATIC_SCROLL_TOLERANCE = 4;
const PROGRAMMATIC_SCROLL_EVENT_WINDOW = 100;
const MARQUEE_CYCLES = 5;
const MARQUEE_HOME_CYCLE = 2;
const PEEK_IMAGE_SIZE = 264;
const PEEK_IMAGE_QUALITY = 72;
const AUTO_SCROLL_VISIBILITY_MARGIN = "200px 0px";

function wrapScrollPosition(position: number, loopWidth: number) {
    if (loopWidth <= 0) return position;

    const loopOffset = ((position % loopWidth) + loopWidth) % loopWidth;
    return loopWidth * MARQUEE_HOME_CYCLE + loopOffset;
}

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

        track.scrollLeft = sequence.offsetWidth * MARQUEE_HOME_CYCLE;
    }, [tools.length, trackRef]);

    useEffect(() => {
        const section = sectionRef.current;
        const track = trackRef.current;
        const sequence = sequenceRef.current;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!section || !track || !sequence || reduceMotion.matches) return;

        let animationFrameId = 0;
        let resumeTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let scrollIdleTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let isPaused = false;
        let isUserScrolling = false;
        let isSectionVisible = false;
        let isRevealComplete = section.dataset.toolsRevealComplete === "true";
        let previousTimestamp = 0;
        let autoScrollPosition = track.scrollLeft;
        let programmaticScrollPosition: number | null = track.scrollLeft;
        let ignoreProgrammaticScrollUntil = 0;
        let loopWidth = sequence.offsetWidth;

        const writeScrollPosition = (position: number) => {
            autoScrollPosition = position;
            programmaticScrollPosition = position;
            ignoreProgrammaticScrollUntil = performance.now() + PROGRAMMATIC_SCROLL_EVENT_WINDOW;
            track.scrollLeft = position;
        };

        const recenterTrack = () => {
            if (loopWidth <= 0) return;

            const homeStart = loopWidth * MARQUEE_HOME_CYCLE;
            const homeEnd = homeStart + loopWidth;
            const position = track.scrollLeft;
            if (position >= homeStart && position < homeEnd) {
                autoScrollPosition = position;
                return;
            }

            writeScrollPosition(wrapScrollPosition(position, loopWidth));
        };

        const pauseAutoScroll = (resumeDelay = AUTO_SCROLL_RESUME_DELAY) => {
            isPaused = true;
            previousTimestamp = 0;
            stopAnimation();

            if (resumeTimeoutId) {
                clearTimeout(resumeTimeoutId);
            }

            resumeTimeoutId = setTimeout(() => {
                if (dragRef.current.active || isUserScrolling) return;

                recenterTrack();
                autoScrollPosition = track.scrollLeft;
                isPaused = false;
                startAnimation();
            }, resumeDelay);
        };

        const finishUserScroll = () => {
            if (dragRef.current.active) {
                scrollIdleTimeoutId = setTimeout(finishUserScroll, SCROLL_IDLE_DELAY);
                return;
            }

            isUserScrolling = false;
            recenterTrack();
            pauseAutoScroll();
        };

        const scheduleUserScrollEnd = (delay = SCROLL_IDLE_DELAY) => {
            if (scrollIdleTimeoutId) clearTimeout(scrollIdleTimeoutId);
            scrollIdleTimeoutId = setTimeout(finishUserScroll, delay);
        };

        const handlePointerDown = () => {
            programmaticScrollPosition = null;
            ignoreProgrammaticScrollUntil = 0;
            isUserScrolling = true;
            if (scrollIdleTimeoutId) clearTimeout(scrollIdleTimeoutId);
            pauseAutoScroll();
        };

        const handlePointerEnd = () => {
            if (isUserScrolling) scheduleUserScrollEnd(AUTO_SCROLL_RESUME_DELAY);
        };

        const handleScroll = () => {
            autoScrollPosition = track.scrollLeft;

            if (
                programmaticScrollPosition !== null &&
                (Math.abs(track.scrollLeft - programmaticScrollPosition) <=
                    PROGRAMMATIC_SCROLL_TOLERANCE ||
                    performance.now() <= ignoreProgrammaticScrollUntil)
            ) {
                autoScrollPosition = track.scrollLeft;
                return;
            }

            programmaticScrollPosition = null;
            ignoreProgrammaticScrollUntil = 0;
            isUserScrolling = true;
            pauseAutoScroll();
            scheduleUserScrollEnd();
        };

        const handleHorizontalWheel = (event: globalThis.WheelEvent) => {
            if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

            programmaticScrollPosition = null;
            ignoreProgrammaticScrollUntil = 0;
            isUserScrolling = true;
            pauseAutoScroll();
            scheduleUserScrollEnd();
        };

        const handleScrollEnd = () => {
            if (!isUserScrolling || dragRef.current.active) return;

            if (scrollIdleTimeoutId) clearTimeout(scrollIdleTimeoutId);
            finishUserScroll();
        };

        const handlePageScroll = () => {
            if (!isSectionVisible) return;
            pauseAutoScroll(PAGE_SCROLL_RESUME_DELAY);
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
            if (!isSectionVisible || !isRevealComplete || document.visibilityState !== "visible") {
                previousTimestamp = 0;
                return;
            }

            if (
                !isPaused &&
                !isUserScrolling &&
                !dragRef.current.active &&
                !isTrackHoveredRef.current
            ) {
                const elapsed = previousTimestamp ? Math.min(timestamp - previousTimestamp, 64) : 0;
                if (loopWidth > 0 && elapsed > 0) {
                    let nextScrollLeft = autoScrollPosition + (AUTO_SCROLL_SPEED * elapsed) / 1000;
                    const homeEnd = loopWidth * (MARQUEE_HOME_CYCLE + 1);

                    if (nextScrollLeft >= homeEnd) {
                        nextScrollLeft = wrapScrollPosition(nextScrollLeft, loopWidth);
                    }

                    writeScrollPosition(nextScrollLeft);
                }
            }

            previousTimestamp = timestamp;
            animationFrameId = requestAnimationFrame(animate);
        };

        const startAnimation = () => {
            if (
                animationFrameId ||
                !isSectionVisible ||
                !isRevealComplete ||
                isPaused ||
                document.visibilityState !== "visible"
            ) {
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

        const handleRevealComplete = () => {
            isRevealComplete = true;
            startAnimation();
        };

        const resizeObserver = new ResizeObserver(() => {
            const nextLoopWidth = sequence.offsetWidth;
            if (nextLoopWidth > 0) loopWidth = nextLoopWidth;
        });

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
        window.addEventListener("scroll", handlePageScroll, { passive: true });
        section.addEventListener(TOOLS_REVEAL_COMPLETE_EVENT, handleRevealComplete);
        track.addEventListener("pointerdown", handlePointerDown);
        track.addEventListener("pointerup", handlePointerEnd);
        track.addEventListener("pointercancel", handlePointerEnd);
        track.addEventListener("scroll", handleScroll, { passive: true });
        track.addEventListener("scrollend", handleScrollEnd);
        track.addEventListener("wheel", handleHorizontalWheel, { passive: true });
        resizeObserver.observe(sequence);
        observer.observe(section);

        return () => {
            pauseAutoScrollRef.current = () => undefined;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("scroll", handlePageScroll);
            section.removeEventListener(TOOLS_REVEAL_COMPLETE_EVENT, handleRevealComplete);
            track.removeEventListener("pointerdown", handlePointerDown);
            track.removeEventListener("pointerup", handlePointerEnd);
            track.removeEventListener("pointercancel", handlePointerEnd);
            track.removeEventListener("scroll", handleScroll);
            track.removeEventListener("scrollend", handleScrollEnd);
            track.removeEventListener("wheel", handleHorizontalWheel);
            resizeObserver.disconnect();
            observer.disconnect();
            stopAnimation();

            if (resumeTimeoutId) {
                clearTimeout(resumeTimeoutId);
            }
            if (scrollIdleTimeoutId) {
                clearTimeout(scrollIdleTimeoutId);
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
        const card = activeCardElRef.current;
        const section = sectionRef.current;
        const track = trackRef.current;
        const overlay = peekOverlayRef.current;

        if (!card || !section || !overlay) return;

        const syncRect = () => {
            frameId = 0;
            const cardRect = card.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            overlay.style.setProperty("--overlay-left", `${cardRect.left - sectionRect.left}px`);
            overlay.style.setProperty("--overlay-top", `${cardRect.top - sectionRect.top}px`);
            overlay.style.setProperty("--overlay-width", `${cardRect.width}px`);
            overlay.style.setProperty("--overlay-height", `${cardRect.height}px`);
        };

        const scheduleSync = () => {
            if (!frameId) frameId = requestAnimationFrame(syncRect);
        };

        const resizeObserver = new ResizeObserver(scheduleSync);
        resizeObserver.observe(card);
        resizeObserver.observe(section);
        track?.addEventListener("scroll", scheduleSync, { passive: true });
        window.addEventListener("resize", scheduleSync, { passive: true });
        scheduleSync();

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            track?.removeEventListener("scroll", scheduleSync);
            window.removeEventListener("resize", scheduleSync);
        };
    }, [activeId, isPeeking, sectionRef, trackRef]);

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        pauseAutoScrollRef.current();
        if (event.pointerType !== "mouse") {
            setIsOverlayActive(false);
            setPinnedId(null);
        }
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
                            aria-hidden={cycle !== MARQUEE_HOME_CYCLE}
                        >
                            {tools.map((tool) => (
                                <Card
                                    key={`${cycle}-${tool.id}`}
                                    tool={tool}
                                    isActive={activeId === tool.id}
                                    data-tools-reveal-card={
                                        cycle === MARQUEE_HOME_CYCLE ? "" : undefined
                                    }
                                    tabIndex={cycle !== MARQUEE_HOME_CYCLE ? -1 : undefined}
                                    onPointerEnter={(event) => {
                                        if (event.pointerType !== "mouse") return;
                                        activeCardElRef.current = event.currentTarget;
                                        setIsOverlayActive(false);
                                        setOverlayTool(tool);
                                        setHoveredId(tool.id);
                                    }}
                                    onPointerLeave={(event) => {
                                        if (event.pointerType !== "mouse") return;
                                        setIsOverlayActive(false);
                                        setHoveredId(null);
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
                                            setIsOverlayActive(false);
                                            if (pinnedId !== tool.id) setOverlayTool(tool);
                                            setPinnedId(pinnedId === tool.id ? null : tool.id);
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
