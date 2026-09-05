"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { Tool } from "@/entities/tool/model/tool";
import { Container, Section } from "@/shared/ui";
import styles from "./ToolsSection.module.scss";
import { Card } from "./components/Card/Card";

interface ToolsSectionLabels {
    title: string;
    description: string;
}

interface ToolsSectionProps {
    tools: Tool[];
    labels: ToolsSectionLabels;
}

export function ToolsSection({ tools, labels }: ToolsSectionProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [pinnedId, setPinnedId] = useState<number | null>(null);
    const pointerTypeRef = useRef<string>("mouse");
    const trackRef = useRef<HTMLDivElement>(null);
    const featuredCardRef = useRef<HTMLButtonElement>(null);
    const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, didDrag: false });
    const featuredId = tools[Math.floor(tools.length / 2)]?.id ?? null;
    const activeId = hoveredId ?? pinnedId;

    useLayoutEffect(() => {
        const track = trackRef.current;
        const featuredCard = featuredCardRef.current;
        if (!track || !featuredCard) return;

        track.scrollLeft =
            featuredCard.offsetLeft + featuredCard.offsetWidth / 2 - track.clientWidth / 2;
    }, [featuredId]);

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const track = event.currentTarget;
        dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: track.scrollLeft,
            didDrag: false,
        };
        track.setPointerCapture(event.pointerId);
    }

    function drag(event: PointerEvent<HTMLDivElement>) {
        const state = dragRef.current;
        if (!state.active) return;

        const deltaX = event.clientX - state.startX;
        if (Math.abs(deltaX) > 3) {
            state.didDrag = true;
        }
        event.currentTarget.scrollLeft = state.scrollLeft - deltaX;
    }

    function endDrag(event: PointerEvent<HTMLDivElement>) {
        if (!dragRef.current.active) return;

        dragRef.current.active = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function scrollWithWheel(event: WheelEvent<HTMLDivElement>) {
        const track = event.currentTarget;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        const nextScrollLeft = Math.min(
            Math.max(track.scrollLeft + delta, 0),
            track.scrollWidth - track.clientWidth
        );

        if (nextScrollLeft === track.scrollLeft) return;

        event.preventDefault();
        track.scrollLeft = nextScrollLeft;
    }

    if (tools.length === 0) {
        return null;
    }

    return (
        <Section id="tools" className={styles.section}>
            <Container className={styles.header}>
                <h2 className={styles.title}>{labels.title}</h2>
                <p className={styles.description}>{labels.description}</p>
            </Container>

            <div
                ref={trackRef}
                className={styles.track}
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onWheel={scrollWithWheel}
            >
                {tools.map((tool) => {
                    const isFeatured = featuredId === tool.id;

                    return (
                        <Card
                            key={tool.id}
                            ref={isFeatured ? featuredCardRef : undefined}
                            tool={tool}
                            isActive={activeId === tool.id}
                            onPointerEnter={(event) => {
                                if (event.pointerType === "mouse") setHoveredId(tool.id);
                            }}
                            onPointerLeave={(event) => {
                                if (event.pointerType === "mouse") setHoveredId(null);
                            }}
                            onPointerDown={(event) => {
                                pointerTypeRef.current = event.pointerType;
                            }}
                            onClick={() => {
                                if (dragRef.current.didDrag) {
                                    dragRef.current.didDrag = false;
                                    return;
                                }

                                if (pointerTypeRef.current !== "mouse") {
                                    setPinnedId((current) =>
                                        current === tool.id ? null : tool.id
                                    );
                                }
                            }}
                        />
                    );
                })}
            </div>
        </Section>
    );
}
