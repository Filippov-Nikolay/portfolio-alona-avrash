"use client";

import { useRef } from "react";
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
import { formatStatValue, type ParsedStatValue } from "./lib/parseStatValue";

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
    const gridRevealTweenRef = useRef<gsap.core.Tween | null>(null);
    const playCountersRef = useRef<() => void>(() => {});
    const revealTriggeredRef = useRef(false);
    const countersTriggeredRef = useRef(false);

    const setValueRef = (index: number) => (el: HTMLSpanElement | null) => {
        valueRefs.current[index] = el;
    };

    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const grid = gridRef.current;
            if (!grid) return;

            if (reduced) {
                gsap.set(grid, { clearProps: "all" });
                gridRevealTweenRef.current = null;
                return;
            }

            if (depthProgress) {
                const tween = gsap.fromTo(
                    grid,
                    { y: 28, filter: "blur(10px)" },
                    {
                        y: 0,
                        filter: "blur(0px)",
                        duration: 0.65,
                        ease: "power2.out",
                        force3D: true,
                        paused: true,
                    }
                );
                const isTriggered = depthProgress.get() >= NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER;

                revealTriggeredRef.current = isTriggered;
                tween.progress(isTriggered ? 1 : 0).pause();
                gridRevealTweenRef.current = tween;

                return () => {
                    gridRevealTweenRef.current = null;
                    tween.kill();
                };
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
            gridRevealTweenRef.current = tween;

            return () => {
                gridRevealTweenRef.current = null;
                tween.kill();
            };
        },
        { scope: sectionRef, dependencies: [depthProgress, reduced], revertOnUpdate: true }
    );

    useGSAP(
        () => {
            const grid = gridRef.current;
            if (!grid) {
                return;
            }

            const counters = parsedValues.map((parsed, index) => ({
                el: valueRefs.current[index],
                parsed,
                state: { current: 0 },
            }));

            const applyInitialValues = () => {
                counters.forEach(({ el, parsed }) => {
                    if (!el || !parsed.isAnimatable) return;

                    el.textContent = formatStatValue(0, parsed);
                });
            };

            const applyFinalValues = () => {
                counters.forEach(({ el, parsed }) => {
                    if (!el || !parsed.isAnimatable) return;

                    el.textContent = formatStatValue(parsed.target, parsed);
                });
            };

            const play = () => {
                counters.forEach(({ el, parsed, state }) => {
                    if (!el || !parsed.isAnimatable) return;

                    state.current = 0;
                    el.textContent = formatStatValue(0, parsed);
                    gsap.to(state, {
                        current: parsed.target,
                        duration: 1.1,
                        ease: "power1.out",
                        overwrite: true,
                        onUpdate: () => {
                            el.textContent = formatStatValue(state.current, parsed);
                        },
                    });
                });
            };
            const cleanupCounterTweens = () => {
                counters.forEach(({ state }) => {
                    gsap.killTweensOf(state);
                });
            };

            playCountersRef.current = play;

            if (reduced) {
                countersTriggeredRef.current = true;
                applyFinalValues();

                return () => {
                    cleanupCounterTweens();
                    playCountersRef.current = () => {};
                };
            }

            if (depthProgress) {
                revealTriggeredRef.current =
                    depthProgress.get() >= NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER;
                countersTriggeredRef.current = depthProgress.get() >= NEXT_SECTION_COUNTER_TRIGGER;

                if (countersTriggeredRef.current) {
                    applyFinalValues();
                } else {
                    applyInitialValues();
                }

                return () => {
                    cleanupCounterTweens();
                    playCountersRef.current = () => {};
                };
            }

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting && !countersTriggeredRef.current) {
                        countersTriggeredRef.current = true;
                        play();
                        observer.disconnect();
                    }
                },
                { threshold: 0.4 }
            );

            observer.observe(grid);

            return () => {
                cleanupCounterTweens();
                playCountersRef.current = () => {};
                observer.disconnect();
            };
        },
        {
            scope: sectionRef,
            dependencies: [depthProgress, reduced, parsedValues],
            revertOnUpdate: true,
        }
    );

    useMotionValueEvent(effectiveDepthProgress, "change", (latest) => {
        if (!depthProgress || reduced) {
            return;
        }

        if (!revealTriggeredRef.current && latest >= NEXT_SECTION_INTERNAL_ANIMATION_TRIGGER) {
            revealTriggeredRef.current = true;
            gridRevealTweenRef.current?.play();
        }

        if (countersTriggeredRef.current || latest < NEXT_SECTION_COUNTER_TRIGGER) {
            return;
        }

        countersTriggeredRef.current = true;
        playCountersRef.current();
    });

    return { sectionRef, gridRef, setValueRef };
}
