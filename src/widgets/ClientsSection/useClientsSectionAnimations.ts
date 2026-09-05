"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { ClientsRow, MarqueeDirection } from "@/entities/client/model/client";
import { useArrayRefs, useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
const getStart = () => (isCompact() ? "top 94%" : "top 84%");
const getEnd = () => (isCompact() ? "top 60%" : "top 42%");

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
            if (!section || !label) return;

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

            if (reduced) {
                gsap.set([label, ...pairs.map((pair) => pair.row)], { clearProps: "all" });
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

            const timeline = gsap
                .timeline({
                    defaults: { ease: "none", force3D: true },
                    scrollTrigger: {
                        trigger: section,
                        start: getStart,
                        end: getEnd,
                        scrub: 0.9,
                        invalidateOnRefresh: true,
                    },
                })
                .fromTo(label, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1 }, 0);

            pairs.forEach((pair, index) => {
                const fromX = pair.direction === "left" ? "100%" : "-100%";
                const marquee = marqueeTweens[index];

                timeline.fromTo(
                    pair.row,
                    { x: fromX },
                    {
                        x: 0,
                        duration: 1,
                        onComplete: () => marquee.play(0),
                        onReverseComplete: () => marquee.pause(0),
                    },
                    0.16 + index * 0.16
                );
            });
        },
        { scope: sectionRef, dependencies: [reduced, rows.length], revertOnUpdate: true }
    );

    return { sectionRef, labelRef, setRowRef, setTrackRef };
}
