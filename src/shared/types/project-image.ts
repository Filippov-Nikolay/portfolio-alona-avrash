export interface ImageFocalPoint {
    x: number;
    y: number;
}

export interface ProjectImage {
    // Stable identity for this image within its project - assigned once and
    // never reused or reassigned, even if the image is later reordered or
    // other images around it are added/removed. Doubles as a React list key.
    id: number;
    // Display position within the project's gallery. This is the field a
    // CMS editor changes to reorder images - consumers must sort by this,
    // never rely on the image's position in the array.
    order: number;
    src: string;
    alt?: string;
    // True for the one image (per project) to use as the preview/hero
    // shot — in a card, a listing thumbnail, an OG image, etc. A project
    // with multiple images should have exactly one marked true.
    isHero?: boolean;
    focalPoint?: ImageFocalPoint;
    scale?: number;
}
