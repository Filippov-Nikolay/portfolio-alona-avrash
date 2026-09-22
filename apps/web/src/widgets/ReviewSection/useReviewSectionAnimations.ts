"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 768px)").matches;
const getStart = () => (isCompact() ? "top 60%" : "top 40%");

const TITLE_CLIP_HIDDEN = "inset(0% 100% 0% 0%)";
const TITLE_CLIP_VISIBLE = "inset(0% 0% 0% 0%)";
const COMPACT_QUERY = "(max-width: 1024px), (pointer: coarse)";
const DESKTOP_QUERY = "(min-width: 1025px) and (pointer: fine)";
const COMPACT_REVEAL_ROOT_MARGIN = "0px 0px -40% 0px";

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
            const allTargets = [
                title,
                aside,
                track,
                decorBack,
                decorFront,
                ...navItems,
                ...cards,
            ].filter((el): el is HTMLElement => Boolean(el));

            if (reduced) {
                gsap.set(allTargets, { clearProps: "all" });
                return;
            }

            const media = gsap.matchMedia();

            media.add(COMPACT_QUERY, () => {
                const revealCards = gsap.utils.toArray<HTMLElement>(
                    "[data-review-reveal-card]",
                    track
                );
                const compactTargets = [title, aside, ...revealCards];

                if (section.dataset.reviewRevealed === "true") {
                    gsap.set(allTargets, {
                        clearProps: "transform,transformOrigin,opacity,visibility,willChange",
                    });
                    return;
                }

                const setLayerHint = () =>
                    gsap.set(compactTargets, { willChange: "transform, opacity" });
                const clearAnimatedProps = () =>
                    gsap.set(compactTargets, {
                        clearProps: "transform,transformOrigin,opacity,visibility,willChange",
                    });

                gsap.set([decorBack, decorFront, ...navItems, ...cards], { clearProps: "all" });
                gsap.set(title, { autoAlpha: 0, y: 24 });
                gsap.set(aside, { autoAlpha: 0, y: 18 });
                gsap.set(revealCards, {
                    autoAlpha: 0,
                    y: 42,
                    scale: 0.965,
                    transformOrigin: "50% 20%",
                });
                setLayerHint();
                section.dataset.reviewRevealReady = "true";

                const timeline = gsap.timeline({
                    paused: true,
                    defaults: { force3D: true },
                    onComplete: clearAnimatedProps,
                });

                timeline
                    .to(title, { autoAlpha: 1, y: 0, duration: 0.68, ease: "power3.out" }, 0)
                    .to(aside, { autoAlpha: 1, y: 0, duration: 0.62, ease: "power3.out" }, 0.1)
                    .to(
                        revealCards,
                        {
                            autoAlpha: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.78,
                            ease: "power3.out",
                        },
                        0.16
                    );

                let hasRevealed = false;
                const reveal = () => {
                    if (hasRevealed) return;
                    hasRevealed = true;
                    section.dataset.reviewRevealed = "true";
                    observer?.disconnect();
                    timeline.play(0);
                };

                const observer =
                    typeof IntersectionObserver === "undefined"
                        ? null
                        : new IntersectionObserver(
                              ([entry]) => {
                                  if (entry?.isIntersecting) reveal();
                              },
                              {
                                  rootMargin: COMPACT_REVEAL_ROOT_MARGIN,
                                  threshold: 0,
                              }
                          );

                if (observer) {
                    observer.observe(section);
                } else {
                    reveal();
                }

                return () => {
                    observer?.disconnect();
                    timeline.kill();
                };
            });

            media.add(DESKTOP_QUERY, () => {
                gsap.set(title, { clipPath: TITLE_CLIP_HIDDEN });
                if (decorBack) {
                    gsap.set(decorBack, {
                        autoAlpha: 0,
                        x: -36,
                        y: -24,
                        rotate: -12,
                        scale: 0.7,
                    });
                }
                if (decorFront) {
                    gsap.set(decorFront, {
                        autoAlpha: 0,
                        x: 30,
                        y: 34,
                        rotate: 12,
                        scale: 0.7,
                    });
                }
                gsap.set(navItems, { autoAlpha: 0, y: 10, rotate: -10, scale: 0.7 });
                gsap.set(cards, {
                    autoAlpha: 0,
                    y: 70,
                    scale: 0.82,
                    rotate: (i) => (i % 2 === 0 ? -7 : 7),
                });

                const timeline = gsap
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
                    timeline.to(
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
                    timeline.to(
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

                timeline
                    .to(
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
                    )
                    .to(
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

                return () => timeline.kill();
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [reduced, totalItems], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, asideRef, trackRef };
}
