const CAMERA_SETTLE_END = 0.96;
const STATS_PERSPECTIVE = 1320;
export const STATS_CAMERA_DURATION = 1000;

export interface StatsCameraConfig {
    compact: boolean;
    reduced: boolean;
}

function interpolate(value: number, input: number[], output: number[]) {
    if (value <= input[0]) return output[0];
    const lastIndex = input.length - 1;
    if (value >= input[lastIndex]) return output[lastIndex];
    for (let index = 1; index < input.length; index++) {
        if (value > input[index]) continue;
        const progress = (value - input[index - 1]) / (input[index] - input[index - 1]);
        return output[index - 1] + (output[index] - output[index - 1]) * progress;
    }
    return output[lastIndex];
}

/** The original camera curve, shared by keyframes and the non-WAAPI fallback. */
export function statsCameraPose(progress: number, { compact, reduced }: StatsCameraConfig) {
    const opacity = reduced
        ? Math.max(0, Math.min(1, progress))
        : interpolate(progress, [0, 0.04, 0.1, 0.22, 0.42, 1], [0, 0.18, 0.52, 0.82, 1, 1]);
    const z = interpolate(
        progress,
        [0, 0.52, CAMERA_SETTLE_END, 1],
        [reduced ? 0 : compact ? 220 : 420, reduced ? 0 : compact ? 92 : 172, 0, 0]
    );
    const scale = reduced
        ? 1
        : interpolate(
              progress,
              [0, 0.24, 0.52, 0.8, CAMERA_SETTLE_END, 1],
              compact ? [2.15, 1.72, 1.38, 1.12, 1, 1] : [2.9, 2.08, 1.52, 1.16, 1, 1]
          );
    const y = interpolate(
        progress,
        [0, 0.55, CAMERA_SETTLE_END, 1],
        [reduced ? 0 : compact ? -240 : -430, reduced ? 0 : compact ? -96 : -170, 0, 0]
    );
    if (compact && !reduced) {
        const projection = STATS_PERSPECTIVE / (STATS_PERSPECTIVE - z);
        return {
            opacity,
            transform: `translate3d(0px, ${y * projection}px, 0px) scale(${scale * projection})`,
        };
    }
    return { opacity, transform: `translate3d(0px, ${y}px, ${z}px) scale(${scale})` };
}

export function statsCameraKeyframes(config: StatsCameraConfig): Keyframe[] {
    // Include every bend so opacity and desktop geometry stay piecewise exact.
    // Only the compact perspective projection needs additional samples.
    const offsets = new Set([
        0,
        0.04,
        0.1,
        0.22,
        0.24,
        0.42,
        0.52,
        0.55,
        0.8,
        CAMERA_SETTLE_END,
        1,
    ]);
    if (config.compact && !config.reduced) {
        for (let step = 1; step < 120; step++) offsets.add(step / 120);
    }
    return [...offsets]
        .sort((a, b) => a - b)
        .map((offset) => ({ offset, ...statsCameraPose(offset, config) }));
}
