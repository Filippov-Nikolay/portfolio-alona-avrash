"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { ClientsRow, MarqueeDirection } from "@avrash/content-schema";
import { useArrayRefs, useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 768px)").matches;
const getStart = () => (isCompact() ? "top 92%" : "top 82%");
const COMPACT_QUERY = "(max-width: 1024px), (pointer: coarse)";
const DESKTOP_QUERY = "(min-width: 1025px) and (pointer: fine)";
const COMPACT_REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";
const MARQUEE_VISIBILITY_MARGIN = "120px 0px";
const REVEAL_DURATION = 0.7;
const REVEAL_START = 0.08;

interface RowRefPair {
    row: HTMLDivElement;
    track: HTMLDivElement;
    direction: MarqueeDirection;
    speed: number;
}

export function useClientsSectionAnimations(rows: ClientsRow[]) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced, rows.length]);

    const sectionRef = useRef<HTMLElement>(null);
    const { refs: rowRefs, setRef: setRowRef } = useArrayRefs<HTMLDivElement>();
    const { refs: trackRefs, setRef: setTrackRef } = useArrayRefs<HTMLDivElement>();

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const pairs = rows
                .map((row, index): RowRefPair | null =>
                    rowRefs.current[index] && trackRefs.current[index]
                        ? {
                              row: rowRefs.current[index]!,
                              track: trackRefs.current[index]!,
                              direction: row.direction,
                              speed: row.speed,
                          }
                        : null
                )
                .filter((pair): pair is RowRefPair => pair !== null);

            if (pairs.length === 0) return;

            const rowTargets = pairs.map((pair) => pair.row);

            if (reduced) {
                gsap.set([...rowTargets, ...pairs.map((pair) => pair.track)], {
                    clearProps: "all",
                });
                section.dataset.clientsMarqueeRunning = "false";
                delete section.dataset.clientsRevealing;
                return;
            }

            const marqueeTweens = pairs.map((pair) => {
                const duration = isCompact() ? 25 : pair.speed;

                return pair.direction === "left"
                    ? gsap.fromTo(
                          pair.track,
                          { xPercent: 0 },
                          {
                              xPercent: -50,
                              duration,
                              ease: "none",
                              repeat: -1,
                              paused: true,
                              force3D: true,
                          }
                      )
                    : gsap.fromTo(
                          pair.track,
                          { xPercent: 0 },
                          {
                              xPercent: 50,
                              duration,
                              ease: "none",
                              repeat: -1,
                              paused: true,
                              force3D: true,
                          }
                      );
            });

            let isNearViewport = false;
            const marqueeStarted = pairs.map(() => false);

            const readIsNearViewport = () => {
                const rect = section.getBoundingClientRect();
                isNearViewport = rect.bottom >= -120 && rect.top <= window.innerHeight + 120;
            };

            const syncMarqueePlayback = () => {
                const shouldPlay = isNearViewport && document.visibilityState === "visible";
                let hasRunningMarquee = false;

                marqueeTweens.forEach((marquee, index) => {
                    if (shouldPlay && marqueeStarted[index]) {
                        marquee.resume();
                        hasRunningMarquee = true;
                    } else {
                        marquee.pause();
                    }
                });

                section.dataset.clientsMarqueeRunning = String(hasRunningMarquee);
            };

            const startMarquee = (index: number) => {
                marqueeStarted[index] = true;
                marqueeTweens[index]?.play(0);
                readIsNearViewport();
                syncMarqueePlayback();
            };

            const visibilityObserver =
                typeof IntersectionObserver === "undefined"
                    ? null
                    : new IntersectionObserver(
                          () => {
                              readIsNearViewport();
                              syncMarqueePlayback();
                          },
                          { rootMargin: MARQUEE_VISIBILITY_MARGIN }
                      );

            if (visibilityObserver) {
                visibilityObserver.observe(section);
            } else {
                isNearViewport = true;
            }

            const handleVisibilityChange = () => syncMarqueePlayback();
            document.addEventListener("visibilitychange", handleVisibilityChange);

            const media = gsap.matchMedia();

            media.add(COMPACT_QUERY, () => {
                if (section.dataset.clientsRevealed === "true") {
                    gsap.set(rowTargets, {
                        clearProps: "transform,opacity,visibility,willChange",
                    });
                    marqueeStarted.fill(true);
                    syncMarqueePlayback();
                    section.dataset.clientsRevealReady = "true";
                    return;
                }

                gsap.set(rowTargets, {
                    xPercent: (index) => (pairs[index]?.direction === "left" ? 100 : -100),
                    willChange: "transform",
                });
                section.dataset.clientsRevealing = "true";
                section.dataset.clientsRevealReady = "true";

                const timeline = gsap.timeline({
                    paused: true,
                    defaults: { force3D: true },
                    onComplete: () => {
                        gsap.set(rowTargets, {
                            clearProps: "transform,opacity,visibility,willChange",
                        });
                        section.dataset.clientsRevealed = "true";
                        delete section.dataset.clientsRevealing;
                        syncMarqueePlayback();
                    },
                });

                rowTargets.forEach((row, index) => {
                    timeline.to(
                        row,
                        {
                            xPercent: 0,
                            duration: REVEAL_DURATION,
                            ease: "power3.out",
                            onStart: () => startMarquee(index),
                        },
                        REVEAL_START
                    );
                });

                let hasStarted = false;
                let revealObserver: IntersectionObserver | null = null;
                const reveal = () => {
                    if (hasStarted) return;
                    hasStarted = true;
                    revealObserver?.disconnect();
                    timeline.play(0);
                };

                if (typeof IntersectionObserver === "undefined") {
                    reveal();
                } else {
                    revealObserver = new IntersectionObserver(
                        ([entry]) => {
                            if (entry?.isIntersecting) reveal();
                        },
                        { rootMargin: COMPACT_REVEAL_ROOT_MARGIN, threshold: 0 }
                    );
                    revealObserver.observe(section);
                }

                return () => {
                    revealObserver?.disconnect();
                    timeline.kill();
                    delete section.dataset.clientsRevealing;
                };
            });

            media.add(DESKTOP_QUERY, () => {
                if (section.dataset.clientsRevealed === "true") {
                    gsap.set(rowTargets, {
                        clearProps: "transform,opacity,visibility,willChange",
                    });
                    marqueeStarted.fill(true);
                    syncMarqueePlayback();
                    section.dataset.clientsRevealReady = "true";
                    return;
                }

                gsap.set(rowTargets, {
                    xPercent: (index) => (pairs[index]?.direction === "left" ? 100 : -100),
                    willChange: "transform",
                });
                section.dataset.clientsRevealing = "true";
                section.dataset.clientsRevealReady = "true";

                const timeline = gsap.timeline({
                    defaults: { force3D: true },
                    onComplete: () => {
                        gsap.set(rowTargets, {
                            clearProps: "transform,opacity,visibility,willChange",
                        });
                        section.dataset.clientsRevealed = "true";
                        delete section.dataset.clientsRevealing;
                        syncMarqueePlayback();
                    },
                    scrollTrigger: {
                        trigger: section,
                        start: getStart,
                        toggleActions: "play none none none",
                    },
                });

                rowTargets.forEach((row, index) => {
                    timeline.to(
                        row,
                        {
                            xPercent: 0,
                            duration: REVEAL_DURATION,
                            ease: "power3.out",
                            onStart: () => startMarquee(index),
                        },
                        REVEAL_START
                    );
                });

                return () => {
                    timeline.kill();
                    delete section.dataset.clientsRevealing;
                };
            });

            syncMarqueePlayback();

            return () => {
                media.revert();
                visibilityObserver?.disconnect();
                marqueeTweens.forEach((marquee) => marquee.kill());
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                section.dataset.clientsMarqueeRunning = "false";
                delete section.dataset.clientsRevealing;
            };
        },
        { scope: sectionRef, dependencies: [reduced, rows.length], revertOnUpdate: true }
    );

    return { sectionRef, setRowRef, setTrackRef };
}
