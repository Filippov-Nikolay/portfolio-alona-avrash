"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { ClientsRow, MarqueeDirection } from "@avrash/content-schema";
import { useArrayRefs, useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 92%" : "top 82%");

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
    const labelRef = useRef<HTMLSpanElement>(null);
    const { refs: rowRefs, setRef: setRowRef } = useArrayRefs<HTMLDivElement>();
    const { refs: trackRefs, setRef: setTrackRef } = useArrayRefs<HTMLDivElement>();

    useGSAP(
        () => {
            const section = sectionRef.current;
            const label = labelRef.current;
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
                gsap.set(label ? [label, ...rowTargets] : rowTargets, { clearProps: "all" });
                return;
            }

            const speedFor = (pair: RowRefPair) => (isCompact() ? 25 : pair.speed);

            const marqueeTweens = pairs.map((pair) =>
                pair.direction === "left"
                    ? gsap.fromTo(
                          pair.track,
                          { xPercent: 0 },
                          {
                              xPercent: -50,
                              duration: speedFor(pair),
                              ease: "none",
                              repeat: -1,
                              paused: true,
                          }
                      )
                    : gsap.fromTo(
                          pair.track,
                          { xPercent: -50 },
                          {
                              xPercent: 0,
                              duration: speedFor(pair),
                              ease: "none",
                              repeat: -1,
                              paused: true,
                          }
                      )
            );
            gsap.set(rowTargets, {
                x: (i) => (pairs[i].direction === "left" ? "100%" : "-100%"),
            });
            if (label) {
                gsap.set(label, { autoAlpha: 0, y: 18 });
            }

            const timeline = gsap.timeline({
                defaults: { force3D: true },
                scrollTrigger: {
                    trigger: section,
                    start: getStart,
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true,
                },
                onReverseComplete: () => marqueeTweens.forEach((marquee) => marquee.pause(0)),
            });

            if (label) {
                timeline.to(label, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0);
            }

            pairs.forEach((pair, index) => {
                const marquee = marqueeTweens[index];

                timeline.to(
                    pair.row,
                    {
                        x: 0,
                        duration: 0.7,
                        ease: "power3.out",
                        onStart: () => marquee.play(0),
                    },
                    0.08 + index * 0.1
                );
            });
        },
        { scope: sectionRef, dependencies: [reduced, rows.length], revertOnUpdate: true }
    );

    return { sectionRef, labelRef, setRowRef, setTrackRef };
}
