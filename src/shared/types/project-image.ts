export interface ImageFocalPoint {
    x: number;
    y: number;
}

export interface ProjectImage {
    src: string;
    alt?: string;
    // True for the one image (per project) to use as the preview/hero
    // shot — in a card, a listing thumbnail, an OG image, etc. A project
    // with multiple images should have exactly one marked true.
    isHero?: boolean;
    focalPoint?: ImageFocalPoint;
    scale?: number;
}
