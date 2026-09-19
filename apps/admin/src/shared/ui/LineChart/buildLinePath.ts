export interface ChartPoint {
    date: string;
    value: number;
}

export interface LinePath {
    d: string;
    maxValue: number;
}

// Pure SVG-path math, kept separate from the rendering component so it can
// be unit tested without a DOM.
export function buildLinePath(points: ChartPoint[], width: number, height: number): LinePath {
    const maxValue = Math.max(1, ...points.map((point) => point.value));

    if (points.length === 0) {
        return { d: "", maxValue };
    }

    if (points.length === 1) {
        const y = height - (points[0]!.value / maxValue) * height;
        return { d: `M 0 ${y} L ${width} ${y}`, maxValue };
    }

    const stepX = width / (points.length - 1);
    const d = points
        .map((point, index) => {
            const x = index * stepX;
            const y = height - (point.value / maxValue) * height;
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

    return { d, maxValue };
}
