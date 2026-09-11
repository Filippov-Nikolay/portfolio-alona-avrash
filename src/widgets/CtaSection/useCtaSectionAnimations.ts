"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 88%" : "top 68%");

export function useCtaSectionAnimations() {
    const reduced = useReducedMotion();
    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const availabilityRef = useRef<HTMLParagraphElement>(null);
    const buttonRef = useRef<HTMLAnchorElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const heading = headingRef.current;
            const availability = availabilityRef.current;
            const button = buttonRef.current;
            if (!section || !heading || !availability || !button) return;

            const arrow = button.querySelector<HTMLElement>("[data-cta-arrow]");
            const allTargets = [heading, availability, button, arrow].filter(
                (el): el is HTMLElement => Boolean(el)
            );

            if (reduced) {
                gsap.set(allTargets, { clearProps: "all" });
                return;
            }

            gsap.set(heading, {
                autoAlpha: 0,
                scale: 1.06,
                filter: "blur(16px)",
                y: 16,
                transformOrigin: "0% 100%",
            });
            gsap.set(availability, { autoAlpha: 0, y: 16 });
            gsap.set(button, { autoAlpha: 0, scale: 0.6, y: 10 });
            if (arrow) {
                gsap.set(arrow, { autoAlpha: 0, scale: 0.4 });
            }

            const tl = gsap
                .timeline({
                    defaults: { force3D: true },
                    scrollTrigger: {
                        trigger: section,
                        start: getStart,
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                })
                .to(
                    heading,
                    {
                        autoAlpha: 1,
                        scale: 1,
                        filter: "blur(0px)",
                        y: 0,
                        duration: 1.1,
                        ease: "power3.out",
                    },
                    0
                )
                .to(availability, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.35)
                .to(
                    button,
                    { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2.2)" },
                    0.5
                );

            if (arrow) {
                tl.to(arrow, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)" }, 0.75);
            }
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, headingRef, availabilityRef, buttonRef };
}
