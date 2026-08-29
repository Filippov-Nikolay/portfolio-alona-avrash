"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { revealHeader } from "@/shared/lib/animation";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;

export function useServicesSectionAnimations() {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const headerLeadRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const header = headerRef.current;
            const wrap = headerLeadRef.current;
            if (!header || !wrap) return;

            revealHeader({
                leading: wrap,
                trigger: header,
                start: isCompact() ? "top 92%" : "top 90%",
                reduced,
            });
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

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

    return { sectionRef, headerRef, headerLeadRef, gridRef };
}
