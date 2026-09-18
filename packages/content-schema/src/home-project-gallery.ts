import type { ProjectImage } from "./project-image";

export interface HomeProjectGalleryCard {
    image: ProjectImage;
}

export interface HomeProjectGalleryConfig {
    visibleCardCount: number;
    cards: HomeProjectGalleryCard[];
}
