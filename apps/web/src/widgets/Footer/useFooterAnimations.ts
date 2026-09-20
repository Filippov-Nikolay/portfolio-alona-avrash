"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const PANEL_CLIP_HIDDEN = "inset(0% 0% 100% 0% round 20px 20px 0px 0px)";
const PANEL_CLIP_VISIBLE = "inset(0% 0% 0% 0% round 20px 20px 0px 0px)";
const COMPACT_QUERY = "(max-width: 1023px), (pointer: coarse)";
const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";

interface UseFooterAnimationsOptions {
    playOnce?: boolean;
}

export function useFooterAnimations({ playOnce = false }: UseFooterAnimationsOptions = {}) {
    const reduced = useReducedMotion();
    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const brandRef = useRef<HTMLParagraphElement>(null);
    const [ready, setReady] = useState(false);

    useGSAP(
        () => {
            const raf = requestAnimationFrame(() => setReady(true));
            return () => cancelAnimationFrame(raf);
        },
        { dependencies: [] }
    );

    useGSAP(
        () => {
            const section = sectionRef.current;
            const left = leftRef.current;
            const right = rightRef.current;
            const brand = brandRef.current;
            if (!ready || !section || !left || !right || !brand) return;

            const maskLines = gsap.utils.toArray<HTMLElement>("[data-footer-mask]", section);
            const socialItems = gsap.utils.toArray<HTMLElement>("[data-footer-social-item]", left);
            const legalItems = gsap.utils.toArray<HTMLElement>("[data-footer-legal-item]", right);
            const chars = gsap.utils.toArray<HTMLElement>("[data-footer-char]", brand);
            const allTargets = [
                section,
                left,
                right,
                brand,
                ...maskLines,
                ...socialItems,
                ...legalItems,
                ...chars,
            ];

            if (reduced) {
                gsap.set(allTargets, { clearProps: "all" });
                return;
            }

            const media = gsap.matchMedia();
            const toggleActions = playOnce ? "play none none none" : "play none none reverse";

            media.add(COMPACT_QUERY, () => {
                const compactTargets = [left, right, brand];
                const setLayerHint = () =>
                    gsap.set(compactTargets, { willChange: "transform, opacity" });
                const clearLayerHint = () => gsap.set(compactTargets, { clearProps: "willChange" });

                gsap.set(section, { clearProps: "clipPath" });
                gsap.set([...maskLines, ...socialItems, ...legalItems, ...chars], {
                    clearProps: "all",
                });
                gsap.set(left, { autoAlpha: 0, y: 24 });
                gsap.set(right, { autoAlpha: 0, y: 24 });
                gsap.set(brand, { autoAlpha: 0, yPercent: 42 });
                setLayerHint();

                const timeline = gsap.timeline({
                    defaults: { force3D: true },
                    onComplete: clearLayerHint,
                    onReverseComplete: clearLayerHint,
                    scrollTrigger: {
                        trigger: section,
                        start: "top 94%",
                        toggleActions,
                        invalidateOnRefresh: true,
                        once: playOnce,
                        onEnter: setLayerHint,
                        onLeaveBack: setLayerHint,
                    },
                });

                timeline
                    .to(left, { autoAlpha: 1, y: 0, duration: 0.64, ease: "power3.out" }, 0)
                    .to(right, { autoAlpha: 1, y: 0, duration: 0.64, ease: "power3.out" }, 0.08)
                    .to(
                        brand,
                        {
                            autoAlpha: 1,
                            yPercent: 0,
                            duration: 0.72,
                            ease: "power3.out",
                        },
                        0.14
                    );

                return () => timeline.kill();
            });

            media.add(DESKTOP_QUERY, () => {
                gsap.set(section, { clipPath: PANEL_CLIP_HIDDEN });
                gsap.set(maskLines, { yPercent: 110 });
                gsap.set(socialItems, { autoAlpha: 0, y: 12, scale: 0.6 });
                gsap.set(legalItems, { autoAlpha: 0, y: 12 });
                gsap.set(chars, {
                    autoAlpha: 0,
                    yPercent: -130,
                    rotate: () => gsap.utils.random(-14, 14),
                });

                const timeline = gsap
                    .timeline({
                        defaults: { force3D: true },
                        scrollTrigger: {
                            trigger: section,
                            start: "top 76%",
                            toggleActions,
                            invalidateOnRefresh: true,
                            once: playOnce,
                        },
                    })
                    .to(
                        section,
                        { clipPath: PANEL_CLIP_VISIBLE, duration: 1.1, ease: "power3.inOut" },
                        0
                    )
                    .to(
                        maskLines,
                        { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.08 },
                        0.25
                    )
                    .to(
                        socialItems,
                        {
                            autoAlpha: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.55,
                            ease: "back.out(2.2)",
                            stagger: 0.06,
                        },
                        0.45
                    )
                    .to(
                        legalItems,
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.5,
                            ease: "power2.out",
                            stagger: 0.06,
                        },
                        0.5
                    )
                    .to(
                        chars,
                        {
                            autoAlpha: 1,
                            yPercent: 0,
                            rotate: 0,
                            duration: 0.7,
                            ease: "back.out(1.6)",
                            stagger: 0.045,
                        },
                        0.5
                    );

                return () => timeline.kill();
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [reduced, ready, playOnce], revertOnUpdate: true }
    );

    return { sectionRef, leftRef, rightRef, brandRef };
}
