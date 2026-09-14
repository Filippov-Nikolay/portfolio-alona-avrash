"use client";

import { useRef } from "react";
import type { Service } from "@/entities/service/model/service";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap, ScrollTrigger } from "@/shared/lib/gsap";
import {
    SERVICES_CARD_REVEAL_DISTANCE,
    SERVICES_CARD_REVEAL_DISTANCE_COMPACT,
    SERVICES_CARD_REVEAL_OVERLAP,
    SERVICES_TITLE_REVEAL_DISTANCE,
} from "@/shared/config/scrollChoreography";
import { getTopBandContactOffset } from "@/shared/lib/motion/servicesSceneGeometry";

const FALLBACK_STACK_OFFSET = 20;

export function useServicesSectionAnimations(services: Service[]) {
    useScrollTriggerAutoRefresh([services]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const media = gsap.matchMedia();

            media.add("(prefers-reduced-motion: no-preference)", () => {
                if (!sectionRef.current) return;
                const title = titleRef.current;
                const grid = gridRef.current;
                if (!title || !grid) return;

                const cards = gsap.utils.toArray<HTMLElement>(":scope > article", grid);

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

                if (cards.length === 0) return;

                gsap.set(cards, {
                    autoAlpha: 0,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    transformOrigin: "center top",
                });

                const setters = cards.map((card) => gsap.quickSetter(card, "css"));
                let revealDistance = 0;
                let stackOffset = 0;
                let revealStarts: number[] = [];

                const measureCards = () => {
                    const scrollY = window.scrollY;
                    revealDistance = getCardRevealDistance();
                    stackOffset =
                        Number.parseFloat(
                            getComputedStyle(grid).getPropertyValue("--_stack-offset")
                        ) || FALLBACK_STACK_OFFSET;
                    const firstCardContact = getContactOffset() - SERVICES_CARD_REVEAL_OVERLAP;
                    revealStarts = cards.map((card, index) => {
                        const runway = card.previousElementSibling;
                        const flowTop = runway
                            ? runway.getBoundingClientRect().bottom + scrollY
                            : grid.getBoundingClientRect().top + scrollY;
                        const stickyTop = Number.parseFloat(getComputedStyle(card).top);

                        if (index === 0) return flowTop - firstCardContact;

                        return flowTop - stickyTop - revealDistance;
                    });
                };

                const renderCards = (scrollY: number) => {
                    const progresses = revealStarts.map((start, index) => {
                        const progress = gsap.utils.clamp(0, 1, (scrollY - start) / revealDistance);
                        return index === 0 ? progress : progress * progress * (3 - 2 * progress);
                    });

                    cards.forEach((card, index) => {
                        const entry = progresses[index];
                        const promotion = progresses[index + 1] ?? 0;
                        const exit = progresses[index + 2] ?? 0;
                        const slotOffset = index === 0 ? 0 : stackOffset * (1 - promotion);

                        setters[index]({
                            autoAlpha: entry > 0 ? 1 - exit : 0,
                            y:
                                (1 - entry) * (index === 0 ? 30 : stackOffset * 4) +
                                slotOffset -
                                exit * stackOffset,
                            scale: 1 - (1 - entry) * 0.015 - (promotion + exit) * 0.02,
                            filter: `blur(${(1 - entry) * 6 + exit * 4}px)`,
                        });
                        card.inert = entry < 1 || promotion > 0;
                    });
                };

                measureCards();

                const cardTrigger = ScrollTrigger.create({
                    trigger: grid,
                    start: "top bottom",
                    end: "bottom top",
                    onRefresh: (self) => {
                        measureCards();
                        renderCards(self.scroll());
                    },
                    onUpdate: (self) => renderCards(self.scroll()),
                });

                renderCards(cardTrigger.scroll());

                return () => {
                    cardTrigger.kill();
                    cards.forEach((card) => {
                        card.inert = false;
                    });
                };
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [services], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, gridRef };
}
