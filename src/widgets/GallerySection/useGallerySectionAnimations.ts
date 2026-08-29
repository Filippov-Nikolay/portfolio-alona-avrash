"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/shared/lib/gsap";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;

const getHeaderStart = () => (isCompact() ? "top 82%" : "top 58%");
const getHeaderEnd = () => (isCompact() ? "top 58%" : "top 34%");
const getFeaturedStart = () => (isCompact() ? "top 84%" : "top 68%");
const getFeaturedEnd = () => (isCompact() ? "top 56%" : "top 42%");

export function useGallerySectionAnimations(enabled = true) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced, enabled]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const terminalWrapRef = useRef<HTMLDivElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const featuredRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLAnchorElement>(null);

    // == Header: terminal left ← · subtitle right → ==============
    useGSAP(
        () => {
            if (!sectionRef.current) return;

            const wrap = terminalWrapRef.current;
            const subtitle = subtitleRef.current;
            const header = headerRef.current;

            if (!wrap || !subtitle || !header) return;

            if (!enabled) {
                gsap.set([wrap, subtitle], { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set([wrap, subtitle], { clearProps: "all" });
                return;
            }

            gsap.timeline({
                defaults: { ease: "none", force3D: true },
                scrollTrigger: {
                    trigger: header,
                    start: getHeaderStart,
                    end: getHeaderEnd,
                    scrub: 0.9,
                    invalidateOnRefresh: true,
                    fastScrollEnd: true,
                },
            })
                .fromTo(
                    wrap,
                    { autoAlpha: 0, x: -32, y: 20, filter: "blur(12px)" },
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", duration: 1 },
                    0
                )
                .fromTo(
                    subtitle,
                    { autoAlpha: 0, x: 32, y: 20, filter: "blur(12px)" },
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", duration: 1 },
                    0.18
                );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Featured card: scale + blur, scroll-scrubbed =============
    useGSAP(
        () => {
            if (!sectionRef.current) return;

            const featured = featuredRef.current;
            if (!featured) return;

            if (!enabled) {
                gsap.set(featured, { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set(featured, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                featured,
                { autoAlpha: 0, y: 64, scale: 0.97, filter: "blur(16px)" },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    duration: 1,
                    ease: "none",
                    force3D: true,
                    scrollTrigger: {
                        trigger: featured,
                        start: getFeaturedStart,
                        end: getFeaturedEnd,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        fastScrollEnd: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == Carousel wrapper: fade-up, fires once on enter ============
    useGSAP(
        () => {
            if (!sectionRef.current) return;

            const carousel = carouselRef.current;
            if (!carousel) return;

            if (!enabled) {
                gsap.set(carousel, { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set(carousel, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                carousel,
                { autoAlpha: 0, y: 36 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    ease: "power3.out",
                    force3D: true,
                    scrollTrigger: {
                        trigger: carousel,
                        start: "top 80%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // == More projects bar: fade-up, fires once on enter ===========
    useGSAP(
        () => {
            if (!sectionRef.current) return;

            const more = moreRef.current;
            if (!more) return;

            if (!enabled) {
                gsap.set(more, { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set(more, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                more,
                { autoAlpha: 0, y: 24 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.55,
                    ease: "power3.out",
                    force3D: true,
                    scrollTrigger: {
                        trigger: more,
                        start: "top 88%",
                        toggleActions: "play none none reverse",
                        invalidateOnRefresh: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    return {
        sectionRef,
        headerRef,
        terminalWrapRef,
        subtitleRef,
        featuredRef,
        carouselRef,
        moreRef,
    };
}
