"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { revealHeader } from "@/shared/lib/animation";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;

export function useContactSectionAnimations(enabled = true) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced, enabled]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const terminalWrapRef = useRef<HTMLDivElement>(null);
    const headlineBlockRef = useRef<HTMLDivElement>(null);
    const linksRef = useRef<HTMLDivElement>(null);

    // == Header: terminal wrap slides in from left ============
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const header = headerRef.current;
            const wrap = terminalWrapRef.current;
            if (!header || !wrap) return;
            if (!enabled) return;

            revealHeader({
                leading: wrap,
                trigger: header,
                start: isCompact() ? "top 92%" : "top 90%",
                reduced,
            });
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Headline: start word slides from left, end word from right ====
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const block = headlineBlockRef.current;
            if (!block) return;
            if (!enabled) return;

            const start = block.querySelector<HTMLElement>("[data-contact-start]");
            const end = block.querySelector<HTMLElement>("[data-contact-end]");
            const tagline = block.querySelector<HTMLElement>("[data-contact-tagline]");

            if (reduced) {
                gsap.set([start, end, tagline].filter(Boolean), { clearProps: "all" });
                return;
            }

            const tl = gsap.timeline({
                defaults: { force3D: true },
                scrollTrigger: {
                    trigger: block,
                    start: "top 80%",
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true,
                },
            });

            if (start) {
                tl.fromTo(
                    start,
                    { x: -70, filter: "blur(22px)" },
                    { x: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out" },
                    0
                );
            }
            if (end) {
                tl.fromTo(
                    end,
                    { x: 70, filter: "blur(22px)" },
                    { x: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out" },
                    0
                );
            }
            if (tagline) {
                tl.fromTo(
                    tagline,
                    { y: 18, filter: "blur(8px)" },
                    { y: 0, filter: "blur(0px)", duration: 0.6, ease: "power2.out" },
                    0.22
                );
            }
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Links: fade up as a unit ============================
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const links = linksRef.current;
            if (!links) return;
            if (!enabled) return;

            if (reduced) {
                gsap.set(links, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                links,
                { y: 28, filter: "blur(10px)" },
                {
                    y: 0,
                    filter: "blur(0px)",
                    duration: 0.65,
                    ease: "power2.out",
                    force3D: true,
                    scrollTrigger: {
                        trigger: links,
                        start: "top 88%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    return { sectionRef, headerRef, terminalWrapRef, headlineBlockRef, linksRef };
}
