const TOP_BAND_ENTRY_VIEWPORT_RATIO = 0.82;
const TOP_BAND_MIN_ENTRY_OFFSET = 72;
const TOP_BAND_EXIT_VIEWPORT_RATIO = 0.35;

export const TOP_BAND_OVERLAP = 20;

interface TopBandGeometry {
    bandHeight: number;
    entryEnd: number;
    entryStart: number;
}

export interface ServicesSceneScrollThresholds {
    entryStart: number;
    entryEnd: number;
    exitStart: number;
    exitEnd: number;
}

export interface ServicesHeaderBandGeometry extends ServicesSceneScrollThresholds {
    bandHeight: number;
}

export function getTopBandGeometry(viewportHeight: number, headerHeight: number): TopBandGeometry {
    const entryEnd = Math.max(headerHeight, TOP_BAND_MIN_ENTRY_OFFSET);

    return {
        bandHeight: headerHeight + TOP_BAND_OVERLAP,
        entryEnd,
        entryStart: viewportHeight * TOP_BAND_ENTRY_VIEWPORT_RATIO,
    };
}

export function getTopBandProgress(
    servicesTop: number,
    viewportHeight: number,
    headerHeight: number
) {
    const { entryEnd, entryStart } = getTopBandGeometry(viewportHeight, headerHeight);
    const range = Math.max(entryStart - entryEnd, 1);

    return Math.min(Math.max((entryStart - servicesTop) / range, 0), 1);
}

export function easeTopBandProgress(progress: number) {
    return progress * progress * (3 - 2 * progress);
}

export function getServicesSceneScrollThresholds(
    servicesTop: number,
    nextSceneTop: number,
    viewportHeight: number,
    headerHeight: number
): ServicesSceneScrollThresholds {
    const { entryEnd, entryStart } = getTopBandGeometry(viewportHeight, headerHeight);
    const exitRange = Math.max(viewportHeight * TOP_BAND_EXIT_VIEWPORT_RATIO, 1);
    const absoluteEntryEnd = servicesTop - entryEnd;
    const absoluteExitEnd = nextSceneTop - headerHeight;

    return {
        entryStart: servicesTop - entryStart,
        entryEnd: absoluteEntryEnd,
        exitStart: Math.max(absoluteEntryEnd, absoluteExitEnd - exitRange),
        exitEnd: absoluteExitEnd,
    };
}

export function getServicesSceneProgressAtScroll(
    scrollY: number,
    { entryStart, entryEnd, exitStart, exitEnd }: ServicesSceneScrollThresholds
) {
    if (scrollY <= entryStart || scrollY >= exitEnd) return 0;

    if (scrollY < entryEnd) {
        return (scrollY - entryStart) / Math.max(entryEnd - entryStart, 1);
    }

    if (scrollY <= exitStart) return 1;

    return 1 - (scrollY - exitStart) / Math.max(exitEnd - exitStart, 1);
}

export function isValidServicesHeaderBandGeometry(
    geometry: ServicesHeaderBandGeometry | null
): geometry is ServicesHeaderBandGeometry {
    if (!geometry) return false;

    const { bandHeight, entryStart, entryEnd, exitStart, exitEnd } = geometry;
    return (
        [bandHeight, entryStart, entryEnd, exitStart, exitEnd].every(Number.isFinite) &&
        bandHeight > 0 &&
        entryStart < entryEnd &&
        entryEnd <= exitStart &&
        exitStart < exitEnd
    );
}

export function calculateServicesHeaderBandY(
    scrollY: number,
    geometry: ServicesHeaderBandGeometry | null
) {
    if (!isValidServicesHeaderBandGeometry(geometry)) return -120;

    const progress = getServicesSceneProgressAtScroll(scrollY, geometry);
    return (easeTopBandProgress(progress) - 1) * geometry.bandHeight;
}

export function getTopBandContactOffset(viewportHeight: number, headerHeight: number) {
    const { bandHeight, entryEnd, entryStart } = getTopBandGeometry(viewportHeight, headerHeight);
    let lower = entryEnd;
    let upper = entryStart;

    for (let index = 0; index < 24; index += 1) {
        const offset = (lower + upper) / 2;
        const bandBottom =
            easeTopBandProgress(getTopBandProgress(offset, viewportHeight, headerHeight)) *
            bandHeight;

        if (offset > bandBottom) {
            upper = offset;
        } else {
            lower = offset;
        }
    }

    return (lower + upper) / 2;
}
