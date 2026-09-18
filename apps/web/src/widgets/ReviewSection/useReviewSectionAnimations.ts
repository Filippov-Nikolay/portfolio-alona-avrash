"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 60%" : "top 40%");

const TITLE_CLIP_HIDDEN = "inset(0% 100% 0% 0%)";
const TITLE_CLIP_VISIBLE = "inset(0% 0% 0% 0%)";

export function useReviewSectionAnimations(totalItems: number) {
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

            const decorBack = aside.querySelector<HTMLElement>("[data-review-decor-back]");
            const decorFront = aside.querySelector<HTMLElement>("[data-review-decor-front]");
            const navItems = gsap.utils.toArray<HTMLElement>("[data-review-nav-item]", aside);
            const cards = gsap.utils.toArray<HTMLElement>("[data-review-card]", track);
            const allTargets = [title, decorBack, decorFront, ...navItems, ...cards].filter(
                (el): el is HTMLElement => Boolean(el)
            );

            if (reduced) {
                gsap.set(allTargets, { clearProps: "all" });
                return;
            }

            gsap.set(title, { clipPath: TITLE_CLIP_HIDDEN });
            if (decorBack) {
                gsap.set(decorBack, { autoAlpha: 0, x: -36, y: -24, rotate: -12, scale: 0.7 });
            }
            if (decorFront) {
                gsap.set(decorFront, { autoAlpha: 0, x: 30, y: 34, rotate: 12, scale: 0.7 });
            }
            gsap.set(navItems, { autoAlpha: 0, y: 10, rotate: -10, scale: 0.7 });
            gsap.set(cards, {
                autoAlpha: 0,
                y: 70,
                scale: 0.82,
                rotate: (i) => (i % 2 === 0 ? -7 : 7),
            });

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
                    title,
                    { clipPath: TITLE_CLIP_VISIBLE, duration: 0.9, ease: "power3.inOut" },
                    0
                );

            if (decorBack) {
                tl.to(
                    decorBack,
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        rotate: 0,
                        scale: 1,
                        duration: 0.7,
                        ease: "back.out(1.7)",
                    },
                    0.15
                );
            }
            if (decorFront) {
                tl.to(
                    decorFront,
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        rotate: 0,
                        scale: 1,
                        duration: 0.7,
                        ease: "back.out(1.7)",
                    },
                    0.25
                );
            }

            tl.to(
                navItems,
                {
                    autoAlpha: 1,
                    y: 0,
                    rotate: 0,
                    scale: 1,
                    duration: 0.5,
                    ease: "back.out(2)",
                    stagger: 0.07,
                },
                0.35
            ).to(
                cards,
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    rotate: 0,
                    duration: 0.85,
                    ease: "back.out(1.3)",
                    stagger: (i: number) => Math.abs(i - totalItems) * 0.06,
                },
                0.25
            );
        },
        { scope: sectionRef, dependencies: [reduced, totalItems], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, asideRef, trackRef };
}
