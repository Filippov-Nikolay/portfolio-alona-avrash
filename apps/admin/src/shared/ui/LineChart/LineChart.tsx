import { buildLinePath, type ChartPoint } from "./buildLinePath";
import styles from "./LineChart.module.css";

interface LineChartProps {
    points: ChartPoint[];
    height?: number;
    label?: string;
}

const WIDTH = 600;

function formatAxisDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

export function LineChart({ points, height = 220, label = "Activity over time" }: LineChartProps) {
    if (points.length === 0) {
        return <div className={styles.empty}>No data yet</div>;
    }

    const { d, maxValue } = buildLinePath(points, WIDTH, height);
    const areaPath = `${d} L ${WIDTH} ${height} L 0 ${height} Z`;
    const midpoint = points[Math.floor((points.length - 1) / 2)]!;
    const halfValue = maxValue > 1 ? Math.ceil(maxValue / 2) : null;

    return (
        <div className={styles.wrap} role="img" aria-label={label}>
            <div className={styles.yAxis} style={{ height }}>
                <span>{maxValue}</span>
                <span>{halfValue}</span>
                <span>0</span>
            </div>
            <div className={styles.chartArea}>
                <div className={styles.plot}>
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
                </div>
                <div className={styles.xAxis}>
                    <span>{formatAxisDate(points[0]!.date)}</span>
                    <span>{formatAxisDate(midpoint.date)}</span>
                    <span>{formatAxisDate(points.at(-1)!.date)}</span>
                </div>
            </div>
        </div>
    );
}
