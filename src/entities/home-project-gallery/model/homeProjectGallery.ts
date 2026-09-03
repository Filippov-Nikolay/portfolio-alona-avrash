import type { ProjectImage } from "@/shared/types/project-image";

export interface HomeProjectGalleryCard {
    image: ProjectImage;
}

export interface HomeProjectGalleryConfig {
    visibleCardCount: number;
    cards: HomeProjectGalleryCard[];
}
