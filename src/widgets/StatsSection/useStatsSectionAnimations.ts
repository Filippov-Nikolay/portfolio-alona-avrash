"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { formatStatValue, type ParsedStatValue } from "./lib/parseStatValue";

export function useStatsSectionAnimations(parsedValues: ParsedStatValue[]) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const setValueRef = (index: number) => (el: HTMLSpanElement | null) => {
        valueRefs.current[index] = el;
    };

    // == Stat grid: fades up as a unit =========================
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const grid = gridRef.current;
            if (!grid) return;

            if (reduced) {
                gsap.set(grid, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
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
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    useGSAP(
        () => {
            const grid = gridRef.current;
            if (!grid || reduced) {
                return;
            }

            const counters = parsedValues.map((parsed, index) => ({
                el: valueRefs.current[index],
                parsed,
                state: { current: 0 },
            }));

            const play = () => {
                counters.forEach(({ el, parsed, state }) => {
                    if (!el || !parsed.isAnimatable) return;

                    state.current = 0;
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

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        play();
                    }
                },
                { threshold: 0.4 }
            );

            observer.observe(grid);

            return () => observer.disconnect();
        },
        { scope: sectionRef, dependencies: [reduced, parsedValues], revertOnUpdate: true }
    );

    return { sectionRef, gridRef, setValueRef };
}
