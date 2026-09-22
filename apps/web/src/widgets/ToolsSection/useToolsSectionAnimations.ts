"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 768px)").matches;
const shouldLockReveal = () => window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
const getStart = () => (isCompact() ? "top 88%" : "top 72%");
const getEnd = () => (isCompact() ? "top 62%" : "top 38%");

export function useToolsSectionAnimations() {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const descriptionRef = useRef<HTMLParagraphElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const title = titleRef.current;
            const description = descriptionRef.current;
            const track = trackRef.current;
            if (!section || !title || !description || !track) return;

            if (reduced) {
                gsap.set([title, description, track], { clearProps: "all" });
                return;
            }

            const playRevealOnce = shouldLockReveal();
            gsap.set(track, { willChange: "opacity" });

            gsap.timeline({
                defaults: { ease: "none", force3D: true },
                onComplete: () => {
                    if (playRevealOnce) {
                        gsap.set([title, description, track], {
                            clearProps: "transform,opacity,visibility,willChange",
                        });
                        return;
                    }

                    gsap.set(track, { clearProps: "willChange" });
                },
                onReverseComplete: () => gsap.set(track, { clearProps: "willChange" }),
                scrollTrigger: {
                    trigger: section,
                    start: getStart,
                    end: getEnd,
                    scrub: playRevealOnce ? false : 0.9,
                    once: playRevealOnce,
                    toggleActions: playRevealOnce ? "play none none none" : undefined,
                    invalidateOnRefresh: true,
                    fastScrollEnd: !playRevealOnce,
                },
            })
                .fromTo(title, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0)
                .fromTo(
                    description,
                    { autoAlpha: 0, y: 28 },
                    { autoAlpha: 1, y: 0, duration: 1 },
                    0.12
                )
                .fromTo(track, { opacity: 0 }, { opacity: 1, duration: 1 }, 0.22);
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, descriptionRef, trackRef };
}
