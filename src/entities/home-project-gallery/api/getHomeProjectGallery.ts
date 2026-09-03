import { fetchContent } from "@/shared/api/contentClient";
import type { HomeProjectGalleryConfig } from "../model/homeProjectGallery";

export function getHomeProjectGallery(): Promise<HomeProjectGalleryConfig> {
    return fetchContent<HomeProjectGalleryConfig>("home-project-gallery", "home-project-gallery");
}
