export interface ProjectedGalleryRow {
    top: number;
    height: number;
    projectedTop: number;
    projectedBottom: number;
}

export function projectGalleryTile(
    top: number,
    height: number,
    rowHeight: number,
    tilt: number,
    depth: number,
    perspective: number
) {
    const angle = (tilt * Math.PI) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const center = top + height / 2;
    const origin = rowHeight / 2;

    const projectEdge = (edge: number) => {
        const projectedDepth = depth + edge * sine;
        const scale = perspective / (perspective - projectedDepth);
        return origin + (center + edge * cosine - origin) * scale;
    };

    return { top: projectEdge(-height / 2), bottom: projectEdge(height / 2) };
}

export function getGalleryRowOffsets(
    rows: ProjectedGalleryRow[],
    gap: number,
    viewportCenter: number
) {
    if (rows.length === 0) return [];

    let packedTop = rows[0].top + rows[0].projectedTop;
    const offsets = rows.map((row) => {
        const offset = packedTop - row.top - row.projectedTop;
        packedTop += row.projectedBottom - row.projectedTop + gap;
        return offset;
    });

    let anchorOffset = offsets[offsets.length - 1];
    for (let index = 0; index < rows.length; index++) {
        const center = rows[index].top + rows[index].height / 2;
        if (center < viewportCenter) continue;

        if (index === 0) {
            anchorOffset = offsets[0];
        } else {
            const previous = rows[index - 1];
            const previousCenter = previous.top + previous.height / 2;
            const progress = (viewportCenter - previousCenter) / (center - previousCenter);
            anchorOffset = offsets[index - 1] + (offsets[index] - offsets[index - 1]) * progress;
        }
        break;
    }

    return offsets.map((offset) => offset - anchorOffset);
}
