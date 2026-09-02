"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import {
    SERVICES_CARD_REVEAL_DISTANCE,
    SERVICES_CARD_REVEAL_DISTANCE_COMPACT,
    SERVICES_CARD_REVEAL_OVERLAP,
    SERVICES_TITLE_REVEAL_DISTANCE,
} from "@/shared/config/scrollChoreography";
import { getTopBandContactOffset } from "@/shared/lib/motion/servicesSceneGeometry";

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
            const getCardRevealDistance = () =>
                window.matchMedia("(max-width: 767px)").matches
                    ? SERVICES_CARD_REVEAL_DISTANCE_COMPACT
                    : SERVICES_CARD_REVEAL_DISTANCE;
            const firstCardStart = () =>
                `top top+=${getContactOffset() - SERVICES_CARD_REVEAL_OVERLAP}`;
            const followingCardStart = (card: HTMLElement) => {
                const stickyTop = Number.parseFloat(getComputedStyle(card).top);
                return `top top+=${stickyTop + getCardRevealDistance()}`;
            };

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
                    end: `+=${SERVICES_TITLE_REVEAL_DISTANCE}`,
                    scrub: true,
                    invalidateOnRefresh: true,
                },
            });

            const [firstCard, ...followingCards] = cards;

            if (firstCard) {
                // Keep the approved scroll-controlled entry for the first card.
                gsap.fromTo(
                    firstCard,
                    { autoAlpha: 0, y: 30, scale: 0.985, filter: "blur(6px)" },
                    {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        ease: "none",
                        force3D: true,
                        scrollTrigger: {
                            trigger: firstCard,
                            start: firstCardStart,
                            end: () => `+=${getCardRevealDistance()}`,
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    }
                );
            }

            followingCards.forEach((card) => {
                gsap.fromTo(
                    card,
                    { autoAlpha: 0, y: 28, filter: "blur(10px)" },
                    {
                        autoAlpha: 1,
                        y: 0,
                        filter: "blur(0px)",
                        ease: "none",
                        force3D: true,
                        scrollTrigger: {
                            trigger: card,
                            start: () => followingCardStart(card),
                            end: () => `+=${getCardRevealDistance()}`,
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    }
                );
            });
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, gridRef };
}
