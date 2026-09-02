"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { getTopBandContactOffset } from "@/shared/lib/motion/servicesSceneGeometry";

const TITLE_REVEAL_DISTANCE = 104;
const CARD_REVEAL_OVERLAP = 42;

export function useServicesSectionAnimations() {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (!sectionRef.current) return;
            const title = titleRef.current;
            const grid = gridRef.current;
            if (!title || !grid) return;

            const cards = gsap.utils.toArray<HTMLElement>(":scope > article", grid);

            if (reduced) {
                gsap.set([title, ...cards], { clearProps: "all" });
                return;
            }

            const getContactOffset = () => {
                const headerHeight =
                    document.querySelector("header")?.getBoundingClientRect().height ?? 96;

                return getTopBandContactOffset(window.innerHeight, headerHeight);
            };

            const titleStart = () => `top top+=${getContactOffset()}`;
            const cardStart = () => `top top+=${getContactOffset() - CARD_REVEAL_OVERLAP}`;

            gsap.set(title, {
                autoAlpha: 0,
                y: 44,
                filter: "blur(5px)",
                clipPath: "inset(100% 0 0)",
            });

            gsap.to(title, {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                clipPath: "inset(0% 0 0)",
                ease: "none",
                force3D: true,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: titleStart,
                    end: `+=${TITLE_REVEAL_DISTANCE}`,
                    scrub: 0.16,
                    invalidateOnRefresh: true,
                },
            });

            gsap.set(cards, { autoAlpha: 0, y: 30, scale: 0.985, filter: "blur(6px)" });

            gsap.to(cards, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: 0.66,
                ease: "power3.out",
                stagger: 0.08,
                force3D: true,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: cardStart,
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true,
                },
            });
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, gridRef };
}
