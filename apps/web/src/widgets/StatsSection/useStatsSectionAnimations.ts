"use client";

import { useCallback, useRef } from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "framer-motion";
import {
    NEXT_SECTION_COUNTER_TRIGGER,
    NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER,
} from "@/shared/config/heroDepthHandoff";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useReducedMotionPreference } from "@/shared/hooks/useReducedMotionPreference";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { isTouchViewport } from "@/shared/lib/motion/mobileViewport";
import { digitWheelPosition, type ParsedStatValue } from "./lib/parseStatValue";

const GRID_REVEAL_START = NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER;
const GRID_REVEAL_END = NEXT_SECTION_COUNTER_TRIGGER;
const COUNTER_START = NEXT_SECTION_COUNTER_TRIGGER;
const COUNTER_END = 0.98;
const PROGRESS_UPDATE_EPSILON = 0.0005;

const revealEase = gsap.parseEase("power2.out");
const counterEase = gsap.parseEase("power1.out");

interface ReelTarget {
    element: HTMLElement;
    place: number;
    continuous: boolean;
    lastPosition: number;
}

interface CounterTarget {
    element: HTMLSpanElement | null;
    parsed: ParsedStatValue;
    reels: ReelTarget[];
}

function windowProgress(value: number, start: number, end: number, ease: (t: number) => number) {
    if (end <= start) return value >= end ? 1 : 0;
    const t = gsap.utils.clamp(0, 1, (value - start) / (end - start));
    return ease(t);
}

function shouldApplyProgress(next: number, previous: number) {
    if (!Number.isFinite(previous)) return true;

    // Reel boundaries are discrete. Even a tiny final progress delta can
    // change a leading digit (for example 899.6 -> 900), so endpoints must
    // never be discarded by the frame deduplication threshold.
    if (next <= 0 || next >= 1) return next !== previous;

    return Math.abs(next - previous) >= PROGRESS_UPDATE_EPSILON;
}

function createCounterTarget(
    element: HTMLSpanElement | null,
    parsed: ParsedStatValue
): CounterTarget {
    const reels = element
        ? Array.from(element.querySelectorAll<HTMLElement>("[data-reel-place]"), (reel) => ({
              element: reel,
              place: Number(reel.dataset.reelPlace),
              continuous: reel.dataset.reelContinuous === "true",
              lastPosition: Number.NaN,
          }))
        : [];

    return { element, parsed, reels };
}

function updateReels(target: CounterTarget, value: number, force = false) {
    target.reels.forEach((reel) => {
        const position = digitWheelPosition(value, reel.place, reel.continuous);

        if (!force && Math.abs(position - reel.lastPosition) < 0.001) return;

        reel.lastPosition = position;
        reel.element.style.transform = `translate3d(0, ${-position}em, 0)`;
    });
}

export function useStatsSectionAnimations(
    parsedValues: ParsedStatValue[],
    depthProgress?: MotionValue<number> | null
) {
    const reduced = useReducedMotionPreference();
    const fallbackDepthProgress = useMotionValue(1);
    const effectiveDepthProgress = depthProgress ?? fallbackDepthProgress;

    // The Hero camera owns this progress and creates no ScrollTriggers here.
    // Changing its motion preference must not refresh/reset the page scroller.
    useScrollTriggerAutoRefresh([depthProgress ?? reduced]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const countersRef = useRef<CounterTarget[]>([]);
    const gridYSetterRef = useRef<ReturnType<typeof gsap.quickSetter> | null>(null);
    const gridFilterSetterRef = useRef<ReturnType<typeof gsap.quickSetter> | null>(null);
    const avoidDynamicBlurRef = useRef(false);
    const renderedProgressRef = useRef({ reveal: Number.NaN, counter: Number.NaN });

    const setValueRef = (index: number) => (el: HTMLSpanElement | null) => {
        valueRefs.current[index] = el;
    };

    useGSAP(
        () => {
            if (!sectionRef.current || depthProgress) return;
            const grid = gridRef.current;
            if (!grid) return;

            if (reduced) {
                gsap.set(grid, { clearProps: "all" });
                return;
            }

            const tween = gsap.fromTo(
                grid,
                { y: 28, filter: "blur(10px)" },
                {
                    y: 0,
                    filter: "blur(0px)",
                    duration: 0.65,
                    ease: "power2.out",
                    force3D: true,
                    scrollTrigger: {
                        trigger: grid,
                        start: "top 88%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                }
            );

            return () => tween.kill();
        },
        { scope: sectionRef, dependencies: [depthProgress, reduced], revertOnUpdate: true }
    );

    useGSAP(
        () => {
            if (!sectionRef.current || depthProgress) return;
            const grid = gridRef.current;
            if (!grid) return;

            const counters = parsedValues.map((parsed, index) =>
                createCounterTarget(valueRefs.current[index], parsed)
            );

            if (reduced) {
                counters.forEach((counter) => {
                    if (counter.element && counter.parsed.isAnimatable) {
                        updateReels(counter, counter.parsed.target);
                    }
                });
                return;
            }

            counters.forEach((counter) => {
                if (counter.element && counter.parsed.isAnimatable) updateReels(counter, 0);
            });

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (!entry.isIntersecting) return;
                    observer.disconnect();

                    counters.forEach((counter) => {
                        if (!counter.element || !counter.parsed.isAnimatable) return;
                        const state = { current: 0 };

                        gsap.fromTo(
                            state,
                            { current: 0 },
                            {
                                current: counter.parsed.target,
                                duration: 1.1,
                                ease: "power1.out",
                                onUpdate: () => updateReels(counter, state.current),
                            }
                        );
                    });
                },
                { threshold: 0.4 }
            );

            observer.observe(grid);
            return () => observer.disconnect();
        },
        {
            scope: sectionRef,
            dependencies: [depthProgress, reduced, parsedValues],
            revertOnUpdate: true,
        }
    );

    useGSAP(
        () => {
            if (!sectionRef.current || !depthProgress) return;
            const grid = gridRef.current;
            if (!grid) return;

            countersRef.current = parsedValues.map((parsed, index) =>
                createCounterTarget(valueRefs.current[index], parsed)
            );
            avoidDynamicBlurRef.current = isTouchViewport();
            renderedProgressRef.current = { reveal: Number.NaN, counter: Number.NaN };

            if (reduced) {
                gsap.set(grid, { clearProps: "all" });
                countersRef.current.forEach((counter) => {
                    if (counter.element && counter.parsed.isAnimatable) {
                        updateReels(counter, counter.parsed.target);
                    }
                });
                return;
            }

            gridYSetterRef.current = gsap.quickSetter(grid, "y", "px");
            gridFilterSetterRef.current = avoidDynamicBlurRef.current
                ? null
                : gsap.quickSetter(grid, "filter");

            if (avoidDynamicBlurRef.current) {
                gsap.set(grid, { filter: "none", force3D: true });
            }

            return () => {
                gridYSetterRef.current = null;
                gridFilterSetterRef.current = null;
            };
        },
        {
            scope: sectionRef,
            dependencies: [depthProgress, reduced, parsedValues],
            revertOnUpdate: true,
        }
    );

    const applyProgress = useCallback(
        (latest: number) => {
            if (!depthProgress || reduced) return;
            const grid = gridRef.current;
            if (!grid) return;

            const revealT = windowProgress(latest, GRID_REVEAL_START, GRID_REVEAL_END, revealEase);
            const rendered = renderedProgressRef.current;

            if (shouldApplyProgress(revealT, rendered.reveal)) {
                gridYSetterRef.current?.(gsap.utils.interpolate(28, 0, revealT));

                if (!avoidDynamicBlurRef.current) {
                    gridFilterSetterRef.current?.(
                        `blur(${gsap.utils.interpolate(10, 0, revealT)}px)`
                    );
                }

                rendered.reveal = revealT;
            }

            const counterT = windowProgress(latest, COUNTER_START, COUNTER_END, counterEase);

            if (shouldApplyProgress(counterT, rendered.counter)) {
                const isEndpoint = counterT <= 0 || counterT >= 1;
                countersRef.current.forEach((counter) => {
                    if (!counter.element || !counter.parsed.isAnimatable) return;
                    updateReels(
                        counter,
                        isEndpoint && counterT >= 1
                            ? counter.parsed.target
                            : gsap.utils.interpolate(0, counter.parsed.target, counterT),
                        isEndpoint
                    );
                });
                rendered.counter = counterT;
            }
        },
        [depthProgress, reduced]
    );

    useGSAP(
        () => {
            if (!depthProgress || reduced) return;
            applyProgress(depthProgress.get());
        },
        { dependencies: [depthProgress, reduced, parsedValues] }
    );

    useMotionValueEvent(effectiveDepthProgress, "change", applyProgress);

    return { sectionRef, gridRef, setValueRef };
}
