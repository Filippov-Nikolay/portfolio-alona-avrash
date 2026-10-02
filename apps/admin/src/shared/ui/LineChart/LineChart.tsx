"use client";

import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent,
} from "react";
import { buildLinePath, type ChartPoint } from "./buildLinePath";
import styles from "./LineChart.module.css";

interface LineChartProps {
    points: ChartPoint[];
    height?: number;
    label?: string;
    seriesLabel?: string;
    interval?: "day" | "week";
}

const WIDTH = 600;
const numberFormat = new Intl.NumberFormat("en-US");
const axisDateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
});
const detailDateFormat = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});

function formatAxisDate(iso: string): string {
    return axisDateFormat.format(new Date(iso));
}

export function LineChart({
    points,
    height = 220,
    label = "Activity over time",
    seriesLabel = "Activity",
    interval = "day",
}: LineChartProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const boundsRef = useRef<DOMRect | null>(null);
    const instructionsId = useId();
    const hasPoints = points.length > 0;
    const selectedIndex = points.findIndex((point) => point.date === selectedDate);
    const selectedPoint = points[selectedIndex];
    const hasSelection = !!selectedPoint;
    const { d, maxValue } = useMemo(() => buildLinePath(points, WIDTH, height), [points, height]);

    useEffect(() => {
        const plot = plotRef.current;
        if (!plot) return;
        const observer = new ResizeObserver(() => {
            boundsRef.current = null;
        });
        observer.observe(plot);
        return () => observer.disconnect();
    }, [hasPoints]);

    useEffect(() => {
        if (!hasSelection) return;
        const dismissOutside = (event: globalThis.PointerEvent) => {
            if (event.target instanceof Node && !plotRef.current?.contains(event.target)) {
                setSelectedDate(null);
            }
        };
        document.addEventListener("pointerdown", dismissOutside);
        return () => document.removeEventListener("pointerdown", dismissOutside);
    }, [hasSelection]);

    function selectAtPointer(event: PointerEvent<HTMLDivElement>) {
        const bounds = boundsRef.current ?? event.currentTarget.getBoundingClientRect();
        boundsRef.current = bounds;
        if (bounds.width === 0) return;
        const progress = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const index = Math.round(progress * (points.length - 1));
        setSelectedDate(points[index]!.date);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const index = selectedIndex < 0 ? points.length - 1 : selectedIndex;
        let nextIndex: number;
        switch (event.key) {
            case "ArrowLeft":
            case "ArrowDown":
                nextIndex = Math.max(0, index - 1);
                break;
            case "ArrowRight":
            case "ArrowUp":
                nextIndex = Math.min(points.length - 1, index + 1);
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = points.length - 1;
                break;
            case "Escape":
                setSelectedDate(null);
                event.preventDefault();
                return;
            default:
                return;
        }
        event.preventDefault();
        setSelectedDate(points[nextIndex]!.date);
    }

    function describeDate(date: string) {
        const formatted = detailDateFormat.format(new Date(date));
        return interval === "week" ? `Week of ${formatted}` : formatted;
    }

    if (!hasPoints) {
        return <div className={styles.empty}>No data yet</div>;
    }

    const areaPath = `${d} L ${WIDTH} ${height} L 0 ${height} Z`;
    const midpoint = points[Math.floor((points.length - 1) / 2)]!;
    const halfValue = maxValue > 1 ? numberFormat.format(maxValue / 2) : null;
    const selectionX = points.length > 1 ? (selectedIndex / (points.length - 1)) * 100 : 50;
    const selectionY = selectedPoint ? (1 - selectedPoint.value / maxValue) * 100 : 0;
    const accessiblePoint = selectedPoint ?? points.at(-1)!;

    return (
        <div className={styles.wrap}>
            <div className={styles.yAxis} style={{ height }} aria-hidden="true">
                <span>{numberFormat.format(maxValue)}</span>
                <span>{halfValue}</span>
                <span>0</span>
            </div>
            <div className={styles.chartArea}>
                <span id={instructionsId} className={styles.srOnly}>
                    Use the arrow keys to inspect values. Home selects the first date, End the last.
                    Escape dismisses the tooltip.
                </span>
                <div
                    ref={plotRef}
                    className={styles.plot}
                    role="slider"
                    tabIndex={0}
                    aria-label={label}
                    aria-describedby={instructionsId}
                    aria-orientation="horizontal"
                    aria-valuemin={0}
                    aria-valuemax={points.length - 1}
                    aria-valuenow={selectedIndex < 0 ? points.length - 1 : selectedIndex}
                    aria-valuetext={`${describeDate(accessiblePoint.date)}: ${seriesLabel}, ${numberFormat.format(accessiblePoint.value)}`}
                    onPointerEnter={(event) => {
                        boundsRef.current = event.currentTarget.getBoundingClientRect();
                        if (event.pointerType === "mouse") selectAtPointer(event);
                    }}
                    onPointerDown={(event) => {
                        boundsRef.current = event.currentTarget.getBoundingClientRect();
                        selectAtPointer(event);
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={selectAtPointer}
                    onPointerLeave={(event) => {
                        if (event.pointerType === "mouse") setSelectedDate(null);
                    }}
                    onPointerCancel={() => setSelectedDate(null)}
                    onFocus={() => setSelectedDate((date) => date ?? points.at(-1)!.date)}
                    onBlur={() => setSelectedDate(null)}
                    onKeyDown={handleKeyDown}
                >
                    <svg
                        viewBox={`0 0 ${WIDTH} ${height}`}
                        preserveAspectRatio="none"
                        className={styles.svg}
                        style={{ height }}
                        aria-hidden="true"
                    >
                        {[0, 0.5, 1].map((position) => (
                            <line
                                key={position}
                                x1="0"
                                x2={WIDTH}
                                y1={height * position}
                                y2={height * position}
                                className={styles.gridLine}
                            />
                        ))}
                        <path d={areaPath} className={styles.area} />
                        <path d={d} className={styles.line} />
                    </svg>
                    {selectedPoint && (
                        <div
                            className={styles.selection}
                            style={
                                {
                                    "--selection-x": `${selectionX}%`,
                                    "--selection-y": `${selectionY}%`,
                                } as CSSProperties
                            }
                        >
                            <div className={styles.guide} aria-hidden="true" />
                            <div className={styles.point} aria-hidden="true" />
                            <div
                                className={styles.tooltip}
                                role="tooltip"
                                data-side={selectionX > 50 ? "left" : "right"}
                                data-position={selectionY < 40 ? "bottom" : "top"}
                            >
                                <div className={styles.tooltipMetric}>
                                    <span className={styles.legendDot} aria-hidden="true" />
                                    <span>{seriesLabel}</span>
                                    <strong>{numberFormat.format(selectedPoint.value)}</strong>
                                </div>
                                <div className={styles.tooltipDate}>
                                    {describeDate(selectedPoint.date)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.xAxis} aria-hidden="true">
                    <span>{formatAxisDate(points[0]!.date)}</span>
                    <span>{formatAxisDate(midpoint.date)}</span>
                    <span>{formatAxisDate(points.at(-1)!.date)}</span>
                </div>
            </div>
        </div>
    );
}
