import type { HomeProjectGalleryCard, HomeProjectGalleryConfig } from "../model/homeProjectGallery";

export function getHomeProjectGalleryCards(
    config: HomeProjectGalleryConfig
): HomeProjectGalleryCard[] {
    return config.cards;
}
