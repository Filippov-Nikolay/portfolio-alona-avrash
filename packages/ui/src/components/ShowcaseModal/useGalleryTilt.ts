"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { getGalleryRowOffsets, projectGalleryTile } from "./galleryTiltGeometry";

const MAX_TILT_DEG = 18;
const MAX_TILT_Z = 100;
const TILT_RESPONSE_MS = 65;
const TILT_SETTLE_THRESHOLD = 0.001;
const TILT_RAMP_DISTANCE = 420;

interface TileTiltState {
    current: number;
    target: number;
    visible: boolean;
    renderedTilt?: string;
    renderedDepth?: string;
}

interface GalleryRowGeometry {
    element: HTMLElement;
    top: number;
    height: number;
    perspective: number;
    tiles: { element: HTMLElement; top: number; height: number }[];
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function getLayoutTop(element: HTMLElement) {
    let top = 0;
    let current: HTMLElement | null = element;

    while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
    }

    return top;
}

export function useGalleryTilt(
    containerRef: RefObject<HTMLElement | null>,
    topBoundaryRef: RefObject<HTMLElement | null>,
    paused = false
) {
    const tilesRef = useRef<Map<number, HTMLElement>>(new Map());
    const registerCallbacksRef = useRef<Map<number, (el: HTMLElement | null) => void>>(new Map());
    const scheduleUpdateRef = useRef<(() => void) | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const reducedMotion = useReducedMotion();
    const pausedRef = useRef(paused);
    const pauseRef = useRef<(() => void) | null>(null);

    useLayoutEffect(() => {
        pausedRef.current = paused;
        if (paused) pauseRef.current?.();
        else scheduleUpdateRef.current?.();
    }, [paused]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || reducedMotion) return;

        const tilesMap = tilesRef.current;
        const tiltStates = new WeakMap<HTMLElement, TileTiltState>();
        const shiftedRows = new Set<HTMLElement>();
        const renderedOffsets = new WeakMap<HTMLElement, string>();
        let rows: GalleryRowGeometry[] = [];
        let rowGap = 0;
        let viewportCenter = 0;
        let frame = 0;
        let needsMeasure = true;
        let previousTime = 0;
        let currentTiltRamp = 1;

        const measure = () => {
            const containerRect = container.getBoundingClientRect();
            if (containerRect.height === 0) return false;

            const topBoundary = Math.max(
                containerRect.top,
                topBoundaryRef.current?.getBoundingClientRect().bottom ?? containerRect.top
            );
            const visibleHeight = containerRect.bottom - topBoundary;
            if (visibleHeight <= 0) return false;

            viewportCenter = topBoundary + visibleHeight / 2;
            const smoothstep = (t: number) => t * t * (3 - 2 * t);
            const distanceFromTop = container.scrollTop;
            const distanceFromBottom =
                container.scrollHeight - container.clientHeight - container.scrollTop;
            const tiltRamp = Math.min(
                smoothstep(clamp(distanceFromTop / TILT_RAMP_DISTANCE, 0, 1)),
                smoothstep(clamp(distanceFromBottom / TILT_RAMP_DISTANCE, 0, 1))
            );
            currentTiltRamp = tiltRamp;
            const contentTop = containerRect.top - getLayoutTop(container) - container.scrollTop;
            const rowGeometry = new Map<HTMLElement, GalleryRowGeometry>();
            for (const tile of tilesMap.values()) {
                const row = tile.offsetParent as HTMLElement | null;
                if (!row) continue;
                let geometry = rowGeometry.get(row);
                if (!geometry) {
                    const rowStyle = getComputedStyle(row);
                    geometry = {
                        element: row,
                        top: contentTop + getLayoutTop(row),
                        height: parseFloat(rowStyle.height),
                        perspective: parseFloat(rowStyle.perspective),
                        tiles: [],
                    };
                    rowGeometry.set(row, geometry);
                }

                const height = parseFloat(getComputedStyle(tile).height);
                const top = geometry.top + tile.offsetTop;
                geometry.tiles.push({ element: tile, top: tile.offsetTop, height });
                const centerY = top + height / 2;
                const relY = (centerY - topBoundary) / visibleHeight;
                const signed = clamp((relY - 0.5) * 2, -1, 1) * tiltRamp;

                const visible =
                    top < containerRect.bottom + height && top + height > topBoundary - height;
                const state = tiltStates.get(tile);

                if (state) {
                    if (!state.visible || !visible) state.current = signed;
                    state.target = signed;
                    state.visible = visible;
                } else {
                    tiltStates.set(tile, { current: signed, target: signed, visible });
                }
            }

            rows = Array.from(rowGeometry.values()).sort((first, second) => first.top - second.top);
            const gallery = rows[0]?.element.parentElement;
            rowGap = gallery ? parseFloat(getComputedStyle(gallery).rowGap) : 0;

            return true;
        };

        const update = (time: number) => {
            frame = 0;
            if (pausedRef.current) return;
            if (needsMeasure) {
                needsMeasure = false;
                if (!measure()) {
                    previousTime = 0;
                    return;
                }
            }

            const elapsed = previousTime ? time - previousTime : 1000 / 60;
            const response = 1 - Math.exp(-elapsed / TILT_RESPONSE_MS);
            let settling = false;

            for (const tile of tilesMap.values()) {
                const state = tiltStates.get(tile);
                if (!state) continue;

                state.current += (state.target - state.current) * response;
                if (Math.abs(state.target - state.current) <= TILT_SETTLE_THRESHOLD) {
                    state.current = state.target;
                } else {
                    settling = true;
                }

                const tilt = (state.current * MAX_TILT_DEG).toFixed(2);
                const depth = (state.current * MAX_TILT_Z).toFixed(1);
                if (tilt !== state.renderedTilt) {
                    tile.style.setProperty("--tilt", tilt);
                    state.renderedTilt = tilt;
                }
                if (depth !== state.renderedDepth) {
                    tile.style.setProperty("--tilt-z", depth);
                    state.renderedDepth = depth;
                }
                const willChange = state.visible ? "transform" : "auto";
                if (tile.style.willChange !== willChange) tile.style.willChange = willChange;
            }

            const projectedRows = rows.map((row) => {
                let projectedTop = Infinity;
                let projectedBottom = -Infinity;

                for (const tile of row.tiles) {
                    const state = tiltStates.get(tile.element);
                    if (!state) continue;
                    const bounds = projectGalleryTile(
                        tile.top,
                        tile.height,
                        row.height,
                        Number(state.renderedTilt),
                        Number(state.renderedDepth),
                        row.perspective
                    );
                    projectedTop = Math.min(projectedTop, bounds.top);
                    projectedBottom = Math.max(projectedBottom, bounds.bottom);
                }

                return { top: row.top, height: row.height, projectedTop, projectedBottom };
            });
            const offsets =
                currentTiltRamp === 0
                    ? rows.map(() => 0)
                    : getGalleryRowOffsets(projectedRows, rowGap, viewportCenter);
            const currentRows = new Set(rows.map((row) => row.element));

            for (const row of shiftedRows) {
                if (currentRows.has(row)) continue;
                row.style.removeProperty("--gallery-row-offset");
                shiftedRows.delete(row);
                renderedOffsets.delete(row);
            }

            rows.forEach((row, index) => {
                const offset = `${offsets[index].toFixed(2)}px`;
                if (renderedOffsets.get(row.element) === offset) return;
                row.element.style.setProperty("--gallery-row-offset", offset);
                renderedOffsets.set(row.element, offset);
                shiftedRows.add(row.element);
            });

            if (settling) {
                previousTime = time;
                frame = requestAnimationFrame(update);
            } else {
                previousTime = 0;
            }
        };

        const scheduleUpdate = () => {
            needsMeasure = true;
            if (pausedRef.current || frame) return;
            frame = requestAnimationFrame(update);
        };

        const resizeObserver = new ResizeObserver(scheduleUpdate);
        resizeObserverRef.current = resizeObserver;
        scheduleUpdateRef.current = scheduleUpdate;
        pauseRef.current = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            previousTime = 0;
        };
        resizeObserver.observe(container);
        if (topBoundaryRef.current) resizeObserver.observe(topBoundaryRef.current);
        for (const tile of tilesMap.values()) resizeObserver.observe(tile);

        let lastScrollTop = container.scrollTop;
        const handleScroll = () => {
            if (pausedRef.current) return;
            if (container.scrollTop === lastScrollTop) return;
            lastScrollTop = container.scrollTop;
            scheduleUpdate();
        };

        scheduleUpdate();
        container.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", scheduleUpdate);

        return () => {
            resizeObserver.disconnect();
            resizeObserverRef.current = null;
            scheduleUpdateRef.current = null;
            pauseRef.current = null;
            cancelAnimationFrame(frame);
            container.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", scheduleUpdate);
            for (const tile of tilesMap.values()) {
                tile.style.removeProperty("--tilt");
                tile.style.removeProperty("--tilt-z");
                tile.style.willChange = "auto";
            }
            for (const row of shiftedRows) row.style.removeProperty("--gallery-row-offset");
        };
    }, [containerRef, topBoundaryRef, reducedMotion]);

    return useCallback((key: number) => {
        let callback = registerCallbacksRef.current.get(key);
        if (!callback) {
            callback = (el: HTMLElement | null) => {
                const previous = tilesRef.current.get(key);
                if (previous) resizeObserverRef.current?.unobserve(previous);

                if (el) {
                    tilesRef.current.set(key, el);
                    resizeObserverRef.current?.observe(el);
                    scheduleUpdateRef.current?.();
                } else {
                    tilesRef.current.delete(key);
                    scheduleUpdateRef.current?.();
                }
            };
            registerCallbacksRef.current.set(key, callback);
        }
        return callback;
    }, []);
}
