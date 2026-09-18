import type { HomeProjectGalleryCard, HomeProjectGalleryConfig } from "@avrash/content-schema";

export function getHomeProjectGalleryCards(
    config: HomeProjectGalleryConfig
): HomeProjectGalleryCard[] {
    return config.cards;
}
