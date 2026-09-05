"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 90%" : "top 78%");
const getEnd = () => (isCompact() ? "top 66%" : "top 48%");

export function useCtaSectionAnimations() {
    const reduced = useReducedMotion();
    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const asideRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const heading = headingRef.current;
            const aside = asideRef.current;
            if (!section || !heading || !aside) return;

            if (reduced) {
                gsap.set([heading, aside], { clearProps: "all" });
                return;
            }

            gsap.timeline({
                defaults: { ease: "none", force3D: true },
                scrollTrigger: {
                    trigger: section,
                    start: getStart,
                    end: getEnd,
                    scrub: 0.9,
                    invalidateOnRefresh: true,
                },
            })
                .fromTo(heading, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0)
                .fromTo(aside, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.1);
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, headingRef, asideRef };
}
