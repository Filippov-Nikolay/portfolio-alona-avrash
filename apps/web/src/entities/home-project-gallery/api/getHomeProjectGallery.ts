import { fetchContent } from "@/shared/api/contentClient";
import type { HomeProjectGalleryConfig } from "@avrash/content-schema";

export function getHomeProjectGallery(): Promise<HomeProjectGalleryConfig> {
    return fetchContent<HomeProjectGalleryConfig>("home-project-gallery", "home-project-gallery");
}
