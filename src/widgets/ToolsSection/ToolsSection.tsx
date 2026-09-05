"use client";

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent,
} from "react";
import { useInView } from "framer-motion";
import type { Tool } from "@/entities/tool/model/tool";
import { Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import styles from "./ToolsSection.module.scss";
import { Card } from "./components/Card/Card";
import { peekBlendSrc, peekStyle } from "./lib/peek";

interface ToolsSectionLabels {
    title: string;
    description: string;
}

interface ToolsSectionProps {
    tools: Tool[];
    labels: ToolsSectionLabels;
}

interface OverlayRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

const AUTO_SCROLL_SPEED = 150;
const AUTO_SCROLL_RESUME_DELAY = 1_500;
const MARQUEE_CYCLES = 4;

export function ToolsSection({ tools, labels }: ToolsSectionProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [pinnedId, setPinnedId] = useState<number | null>(null);
    const [overlayTool, setOverlayTool] = useState<Tool | null>(null);
    const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const pointerTypeRef = useRef<string>("mouse");
    const sectionRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const sequenceRef = useRef<HTMLDivElement>(null);
    const activeCardElRef = useRef<HTMLButtonElement | null>(null);
    const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, didDrag: false });
    const isTrackHoveredRef = useRef(false);
    const pauseAutoScrollRef = useRef<() => void>(() => undefined);
    const activeId = hoveredId ?? pinnedId;
    const isPeeking = activeId !== null;
    const isInView = useInView(sectionRef, {
        once: true,
        amount: 0.3,
        margin: "0px 0px -45% 0px",
    });

    useLayoutEffect(() => {
        const track = trackRef.current;
        const sequence = sequenceRef.current;
        if (!track || !sequence) return;

        track.scrollLeft = sequence.offsetWidth;
    }, [tools.length]);

    useEffect(() => {
        const track = trackRef.current;
        const sequence = sequenceRef.current;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!track || !sequence || reduceMotion.matches) return;

        let animationFrameId = 0;
        let resumeTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let isPaused = false;
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

        const resetAnimationTimestamp = () => {
            previousTimestamp = 0;
        };

        const animate = (timestamp: number) => {
            if (
                !isPaused &&
                !dragRef.current.active &&
                !isTrackHoveredRef.current &&
                document.visibilityState === "visible"
            ) {
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

        pauseAutoScrollRef.current = pauseAutoScroll;
        document.addEventListener("visibilitychange", resetAnimationTimestamp);
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            pauseAutoScrollRef.current = () => undefined;
            document.removeEventListener("visibilitychange", resetAnimationTimestamp);
            cancelAnimationFrame(animationFrameId);

            if (resumeTimeoutId) {
                clearTimeout(resumeTimeoutId);
            }
        };
    }, [tools.length]);

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
    }, []);

    const [lastActiveId, setLastActiveId] = useState<number | null>(null);
    if (activeId !== lastActiveId) {
        setLastActiveId(activeId);
        setIsOverlayActive(false);
        if (activeId !== null) {
            setOverlayTool(tools.find((tool) => tool.id === activeId) ?? null);
        }
    }

    useLayoutEffect(() => {
        if (!isPeeking) return;

        const frameId = requestAnimationFrame(() => {
            setIsOverlayActive(true);
        });

        return () => cancelAnimationFrame(frameId);
    }, [activeId, isPeeking]);

    useEffect(() => {
        if (!isPeeking) return;

        let frameId = 0;
        const syncRect = () => {
            const card = activeCardElRef.current;
            const section = sectionRef.current;
            if (card && section) {
                const cardRect = card.getBoundingClientRect();
                const sectionRect = section.getBoundingClientRect();
                setOverlayRect({
                    left: cardRect.left - sectionRect.left,
                    top: cardRect.top - sectionRect.top,
                    width: cardRect.width,
                    height: cardRect.height,
                });
            }
            frameId = requestAnimationFrame(syncRect);
        };
        frameId = requestAnimationFrame(syncRect);

        return () => cancelAnimationFrame(frameId);
    }, [isPeeking]);

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const track = event.currentTarget;
        dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: track.scrollLeft,
            didDrag: false,
        };
        track.setPointerCapture(event.pointerId);
    }

    function drag(event: PointerEvent<HTMLDivElement>) {
        const state = dragRef.current;
        if (!state.active) return;

        const deltaX = event.clientX - state.startX;
        if (Math.abs(deltaX) > 3) {
            state.didDrag = true;
            pauseAutoScrollRef.current();
        }
        event.currentTarget.scrollLeft = state.scrollLeft - deltaX;
    }

    function endDrag(event: PointerEvent<HTMLDivElement>) {
        if (!dragRef.current.active) return;

        dragRef.current.active = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function pauseOnTrackHover() {
        isTrackHoveredRef.current = true;
        pauseAutoScrollRef.current();
    }

    function resumeAfterTrackHover() {
        isTrackHoveredRef.current = false;
        pauseAutoScrollRef.current();
    }

    if (tools.length === 0) {
        return null;
    }

    const overlayStyle = overlayRect
        ? ({
              "--overlay-left": `${overlayRect.left}px`,
              "--overlay-top": `${overlayRect.top}px`,
              "--overlay-width": `${overlayRect.width}px`,
              "--overlay-height": `${overlayRect.height}px`,
          } as CSSProperties)
        : undefined;

    return (
        <Section id="tools" ref={sectionRef} className={styles.section}>
            <Container className={cn(styles.header, isInView && styles.headerVisible)}>
                <h2 className={styles.title}>{labels.title}</h2>
                <p className={styles.description}>{labels.description}</p>
            </Container>

            <div
                ref={trackRef}
                className={cn(styles.track, isInView && styles.trackVisible)}
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
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

            {overlayTool && (
                <div
                    className={cn(styles.peekOverlay, isOverlayActive && styles.peekOverlayActive)}
                    style={overlayStyle}
                    aria-hidden="true"
                >
                    {overlayTool.images.map((image, index) => (
                        <span key={image.src} className={styles.cardItem} style={peekStyle(index)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={peekBlendSrc(image.src)}
                                alt=""
                                className={styles.cardItemImg}
                            />
                        </span>
                    ))}
                </div>
            )}
        </Section>
    );
}
