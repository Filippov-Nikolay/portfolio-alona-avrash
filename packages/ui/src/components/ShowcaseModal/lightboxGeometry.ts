export interface LightboxRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export function fitImage(
    width: number,
    height: number,
    frame: LightboxRect,
    cover = false
): LightboxRect {
    const scale = (cover ? Math.max : Math.min)(frame.width / width, frame.height / height);
    return {
        left: frame.left + (frame.width - width * scale) / 2,
        top: frame.top + (frame.height - height * scale) / 2,
        width: width * scale,
        height: height * scale,
    };
}

function interpolate(from: LightboxRect, to: LightboxRect, progress: number): LightboxRect {
    return {
        left: from.left + (to.left - from.left) * progress,
        top: from.top + (to.top - from.top) * progress,
        width: from.width + (to.width - from.width) * progress,
        height: from.height + (to.height - from.height) * progress,
    };
}

// Sample the reciprocal scale into compositor keyframes. Interpolating only the
// endpoints of 1/scale would stretch the image midway through a nonuniform FLIP.
// No geometry reads, layout writes, or JS callbacks are needed during playback.
export function flipFrames(
    viewport: LightboxRect,
    fromFrame: LightboxRect,
    toFrame: LightboxRect,
    fromImage: LightboxRect,
    toImage: LightboxRect,
    imageWidth: number,
    imageHeight: number
) {
    const frame: Keyframe[] = [];
    const image: Keyframe[] = [];
    for (let step = 0; step <= 120; step++) {
        const progress = step / 120;
        const bounds = interpolate(fromFrame, toFrame, progress);
        const content = interpolate(fromImage, toImage, progress);
        const sx = bounds.width / viewport.width;
        const sy = bounds.height / viewport.height;
        frame.push({
            transform: `translate3d(${bounds.left - viewport.left}px, ${bounds.top - viewport.top}px, 0) scale(${sx}, ${sy})`,
        });
        image.push({
            transform: `translate3d(${(content.left - bounds.left) / sx}px, ${(content.top - bounds.top) / sy}px, 0) scale(${content.width / imageWidth / sx}, ${content.height / imageHeight / sy})`,
        });
    }
    return { frame, image };
}
