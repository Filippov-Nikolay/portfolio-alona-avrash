"use client";

import { useCallback, useRef } from "react";
import {
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    type MotionValue,
} from "framer-motion";
import {
    NEXT_SECTION_COUNTER_TRIGGER,
    NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER,
} from "@/shared/config/heroDepthHandoff";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { digitWheelPosition, type ParsedStatValue } from "./lib/parseStatValue";

const GRID_REVEAL_START = NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER;
const GRID_REVEAL_END = NEXT_SECTION_COUNTER_TRIGGER;
const COUNTER_START = NEXT_SECTION_COUNTER_TRIGGER;
const COUNTER_END = 0.98;

const revealEase = gsap.parseEase("power2.out");
const counterEase = gsap.parseEase("power1.out");

function windowProgress(value: number, start: number, end: number, ease: (t: number) => number) {
    if (end <= start) return value >= end ? 1 : 0;
    const t = gsap.utils.clamp(0, 1, (value - start) / (end - start));
    return ease(t);
}

function updateReels(container: HTMLElement, value: number) {
    const reels = container.querySelectorAll<HTMLElement>("[data-reel-place]");
    reels.forEach((reel) => {
        const place = Number(reel.dataset.reelPlace);
        const continuous = reel.dataset.reelContinuous === "true";
        reel.style.transform = `translateY(${-digitWheelPosition(value, place, continuous)}em)`;
    });
}

export function useStatsSectionAnimations(
    parsedValues: ParsedStatValue[],
    depthProgress?: MotionValue<number> | null
) {
    const reduced = useReducedMotion();
    const fallbackDepthProgress = useMotionValue(1);
    const effectiveDepthProgress = depthProgress ?? fallbackDepthProgress;

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const countersRef = useRef<{ el: HTMLSpanElement | null; parsed: ParsedStatValue }[]>([]);

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

            const counters = parsedValues.map((parsed, index) => ({
                el: valueRefs.current[index],
                parsed,
            }));

            if (reduced) {
                counters.forEach(({ el, parsed }) => {
                    if (el && parsed.isAnimatable) updateReels(el, parsed.target);
                });
                return;
            }

            counters.forEach(({ el, parsed }) => {
                if (el && parsed.isAnimatable) updateReels(el, 0);
            });

            const state = { current: 0 };
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (!entry.isIntersecting) return;
                    observer.disconnect();

                    counters.forEach(({ el, parsed }) => {
                        if (!el || !parsed.isAnimatable) return;
                        gsap.fromTo(
                            state,
                            { current: 0 },
                            {
                                current: parsed.target,
                                duration: 1.1,
                                ease: "power1.out",
                                onUpdate: () => updateReels(el, state.current),
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

            countersRef.current = parsedValues.map((parsed, index) => ({
                el: valueRefs.current[index],
                parsed,
            }));

            if (reduced) {
                gsap.set(grid, { clearProps: "all" });
                countersRef.current.forEach(({ el, parsed }) => {
                    if (el && parsed.isAnimatable) updateReels(el, parsed.target);
                });
            }
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
            gsap.set(grid, {
                y: gsap.utils.interpolate(28, 0, revealT),
                filter: `blur(${gsap.utils.interpolate(10, 0, revealT)}px)`,
            });

            const counterT = windowProgress(latest, COUNTER_START, COUNTER_END, counterEase);
            countersRef.current.forEach(({ el, parsed }) => {
                if (!el || !parsed.isAnimatable) return;
                updateReels(el, gsap.utils.interpolate(0, parsed.target, counterT));
            });
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
