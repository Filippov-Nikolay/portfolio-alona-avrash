import { buildLinePath, type ChartPoint } from "./buildLinePath";
import styles from "./LineChart.module.css";

interface LineChartProps {
    points: ChartPoint[];
    height?: number;
}

const WIDTH = 600;

function formatAxisDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LineChart({ points, height = 200 }: LineChartProps) {
    if (points.length === 0) {
        return <div className={styles.empty}>No data yet</div>;
    }

    const { d, maxValue } = buildLinePath(points, WIDTH, height);

    return (
        <div className={styles.wrap}>
            <div className={styles.yAxis} style={{ height }}>
                <span>{maxValue}</span>
                <span>0</span>
            </div>
            <div className={styles.chartArea}>
                <svg
                    viewBox={`0 0 ${WIDTH} ${height}`}
                    preserveAspectRatio="none"
                    className={styles.svg}
                    style={{ height }}
                >
                    <path d={d} className={styles.line} />
                </svg>
                <div className={styles.xAxis}>
                    <span>{formatAxisDate(points[0]!.date)}</span>
                    <span>{formatAxisDate(points.at(-1)!.date)}</span>
                </div>
            </div>
        </div>
    );
}
