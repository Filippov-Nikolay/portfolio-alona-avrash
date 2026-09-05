"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 90%" : "top 76%");
const getEnd = () => (isCompact() ? "top 64%" : "top 44%");

export function useReviewSectionAnimations() {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const asideRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const title = titleRef.current;
            const aside = asideRef.current;
            const track = trackRef.current;
            if (!section || !title || !aside || !track) return;

            if (reduced) {
                gsap.set([title, aside, track], { clearProps: "all" });
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
                .fromTo(title, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0)
                .fromTo(aside, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.1)
                .fromTo(track, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.2);
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, asideRef, trackRef };
}
