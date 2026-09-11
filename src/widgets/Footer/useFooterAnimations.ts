"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 88%" : "top 76%");

const PANEL_CLIP_HIDDEN = "inset(0% 0% 100% 0% round 20px 20px 0px 0px)";
const PANEL_CLIP_VISIBLE = "inset(0% 0% 0% 0% round 20px 20px 0px 0px)";

export function useFooterAnimations() {
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
            const allTargets = [section, ...maskLines, ...socialItems, ...legalItems, ...chars];

            if (reduced) {
                gsap.set(allTargets, { clearProps: "all" });
                return;
            }

            gsap.set(section, { clipPath: PANEL_CLIP_HIDDEN });
            gsap.set(maskLines, { yPercent: 110 });
            gsap.set(socialItems, { autoAlpha: 0, y: 12, scale: 0.6 });
            gsap.set(legalItems, { autoAlpha: 0, y: 12 });
            gsap.set(chars, {
                autoAlpha: 0,
                yPercent: -130,
                rotate: () => gsap.utils.random(-14, 14),
            });

            gsap.timeline({
                defaults: { force3D: true },
                scrollTrigger: {
                    trigger: section,
                    start: getStart,
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true,
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
                    { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.06 },
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
        },
        { scope: sectionRef, dependencies: [reduced, ready], revertOnUpdate: true }
    );

    return { sectionRef, leftRef, rightRef, brandRef };
}
