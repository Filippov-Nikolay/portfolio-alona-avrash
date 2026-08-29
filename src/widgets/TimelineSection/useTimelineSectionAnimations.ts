"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useArrayRefs, useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { revealHeader } from "@/shared/lib/animation";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getHeaderStart = () => (isCompact() ? "top 92%" : "top 90%");

export function useTimelineSectionAnimations(entryCount: number, enabled = true) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced, entryCount, enabled]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const terminalWrapRef = useRef<HTMLDivElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const timelineLineRef = useRef<HTMLDivElement>(null);
    const { refs: entryRefs, setRef: setEntryRef } = useArrayRefs<HTMLDivElement>();

    // == Header: terminal ← · subtitle → ==================
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const header = headerRef.current;
            const wrap = terminalWrapRef.current;
            const subtitle = subtitleRef.current;
            if (!header || !wrap) return;
            if (!enabled) return;

            revealHeader({
                leading: wrap,
                trailing: subtitle,
                trigger: header,
                start: getHeaderStart,
                reduced,
            });
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Timeline track: draw top-to-bottom ===============
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const line = timelineLineRef.current;
            if (!line) return;

            if (!enabled) return;

            if (reduced) {
                gsap.set(line, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                line,
                { scaleY: 0 },
                {
                    scaleY: 1,
                    duration: 1.1,
                    ease: "power2.out",
                    force3D: true,
                    scrollTrigger: {
                        trigger: line,
                        start: "top 68%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Entry cards: per-entry timeline (card + dot + dates + tags) ===
    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const entries = entryRefs.current.filter(Boolean) as HTMLDivElement[];
            if (!entries.length) return;

            if (!enabled) return;

            if (reduced) {
                entries.forEach((entry) => {
                    const card = entry.querySelector<HTMLElement>("[data-timeline-card]");
                    const dot = entry.querySelector<HTMLElement>("[data-timeline-dot]");
                    const dates = entry.querySelector<HTMLElement>("[data-timeline-dates]");
                    const tags = entry.querySelector<HTMLElement>("[data-timeline-tags]");
                    gsap.set([card, dot, dates, tags].filter(Boolean), { clearProps: "all" });
                });
                return;
            }

            entries.forEach((entry) => {
                const card = entry.querySelector<HTMLElement>("[data-timeline-card]");
                const dot = entry.querySelector<HTMLElement>("[data-timeline-dot]");
                const dates = entry.querySelector<HTMLElement>("[data-timeline-dates]");
                const tags = entry.querySelector<HTMLElement>("[data-timeline-tags]");

                const tl = gsap.timeline({
                    defaults: { force3D: true },
                    scrollTrigger: {
                        trigger: entry,
                        start: "top 70%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                });

                // 1. Card: blur + scale + rise
                if (card) {
                    tl.fromTo(
                        card,
                        { y: 56, scale: 0.96, filter: "blur(20px)" },
                        { y: 0, scale: 1, filter: "blur(0px)", duration: 0.85, ease: "power3.out" },
                        0
                    );
                }

                // 2. Dates: slide in from left
                if (dates) {
                    tl.fromTo(
                        dates,
                        { x: -20, filter: "blur(6px)" },
                        { x: 0, filter: "blur(0px)", duration: 0.55, ease: "power2.out" },
                        0.18
                    );
                }

                // 3. Tags: slide in from right
                if (tags) {
                    tl.fromTo(
                        tags,
                        { x: 24, filter: "blur(6px)" },
                        { x: 0, filter: "blur(0px)", duration: 0.55, ease: "power2.out" },
                        0.28
                    );
                }

                // 4. Dot: pop-in with overshoot
                if (dot) {
                    tl.fromTo(
                        dot,
                        { scale: 0 },
                        { scale: 1, duration: 0.5, ease: "back.out(2)" },
                        0.35
                    );
                }
            });
        },
        { scope: sectionRef, dependencies: [reduced, entryCount, enabled], revertOnUpdate: true }
    );

    return {
        sectionRef,
        headerRef,
        terminalWrapRef,
        subtitleRef,
        timelineLineRef,
        setEntryRef,
    };
}
