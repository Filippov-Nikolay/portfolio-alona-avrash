"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 768px)").matches;
const getStart = () => (isCompact() ? "top 88%" : "top 72%");
const getEnd = () => (isCompact() ? "top 62%" : "top 38%");
const COMPACT_QUERY = "(max-width: 1024px), (pointer: coarse)";
const DESKTOP_QUERY = "(min-width: 1025px) and (pointer: fine)";
const COMPACT_REVEAL_ROOT_MARGIN = "0px 0px -12% 0px";

export const TOOLS_REVEAL_COMPLETE_EVENT = "tools:reveal-complete";

export function useToolsSectionAnimations() {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const descriptionRef = useRef<HTMLParagraphElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const title = titleRef.current;
            const description = descriptionRef.current;
            const track = trackRef.current;
            if (!section || !title || !description || !track) return;

            const finishReveal = () => {
                section.dataset.toolsRevealStarted = "true";
                section.dataset.toolsRevealed = "true";
                section.dataset.toolsRevealComplete = "true";
                section.dispatchEvent(new Event(TOOLS_REVEAL_COMPLETE_EVENT));
            };

            if (reduced) {
                gsap.set([title, description, track], { clearProps: "all" });
                finishReveal();
                return;
            }

            const media = gsap.matchMedia();

            media.add(COMPACT_QUERY, () => {
                const revealCards = gsap.utils.toArray<HTMLElement>(
                    "[data-tools-reveal-card]",
                    track
                );
                const targets = [title, description, ...revealCards];

                if (
                    section.dataset.toolsRevealStarted === "true" ||
                    section.dataset.toolsRevealComplete === "true"
                ) {
                    gsap.set(targets, {
                        clearProps: "transform,opacity,visibility,willChange",
                    });
                    finishReveal();
                    return;
                }

                gsap.set(title, {
                    autoAlpha: 0,
                    y: 28,
                });
                gsap.set(description, {
                    autoAlpha: 0,
                    y: 28,
                });
                gsap.set(revealCards, { autoAlpha: 0 });
                section.dataset.toolsRevealReady = "true";

                const timeline = gsap
                    .timeline({
                        paused: true,
                        defaults: { force3D: true },
                        onComplete: () => {
                            gsap.set(targets, {
                                clearProps: "transform,opacity,visibility,willChange",
                            });
                            finishReveal();
                        },
                    })
                    .to(title, { autoAlpha: 1, y: 0, duration: 0.72, ease: "power3.out" }, 0)
                    .to(
                        description,
                        { autoAlpha: 1, y: 0, duration: 0.72, ease: "power3.out" },
                        0.1
                    )
                    .to(revealCards, { autoAlpha: 1, duration: 0.76, ease: "power2.out" }, 0.2);

                let hasStarted = false;
                let observer: IntersectionObserver | null = null;
                const reveal = () => {
                    if (hasStarted) return;
                    hasStarted = true;
                    section.dataset.toolsRevealStarted = "true";
                    gsap.set([title, description], { willChange: "transform, opacity" });
                    gsap.set(revealCards, { willChange: "opacity" });
                    observer?.disconnect();
                    timeline.play(0);
                };

                if (typeof IntersectionObserver === "undefined") {
                    reveal();
                } else {
                    observer = new IntersectionObserver(
                        ([entry]) => {
                            if (entry?.isIntersecting) reveal();
                        },
                        { rootMargin: COMPACT_REVEAL_ROOT_MARGIN, threshold: 0 }
                    );
                    observer.observe(section);
                }

                return () => {
                    observer?.disconnect();
                    timeline.kill();
                };
            });

            media.add(DESKTOP_QUERY, () => {
                gsap.set(track, { willChange: "opacity" });

                const timeline = gsap
                    .timeline({
                        defaults: { ease: "none", force3D: true },
                        onComplete: () => {
                            gsap.set(track, { clearProps: "willChange" });
                            finishReveal();
                        },
                        onReverseComplete: () => gsap.set(track, { clearProps: "willChange" }),
                        scrollTrigger: {
                            trigger: section,
                            start: getStart,
                            end: getEnd,
                            scrub: 0.9,
                            invalidateOnRefresh: true,
                            fastScrollEnd: true,
                        },
                    })
                    .fromTo(title, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1 }, 0)
                    .fromTo(
                        description,
                        { autoAlpha: 0, y: 28 },
                        { autoAlpha: 1, y: 0, duration: 1 },
                        0.12
                    )
                    .fromTo(track, { opacity: 0 }, { opacity: 1, duration: 1 }, 0.22);

                return () => timeline.kill();
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, descriptionRef, trackRef };
}
