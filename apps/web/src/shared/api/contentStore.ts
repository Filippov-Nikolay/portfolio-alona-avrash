import * as contentData from "@avrash/content-data";
import type { ContentResource } from "@avrash/content-schema";

const CONTENT: Record<ContentResource, unknown> = {
    cv: contentData.cv,
    hero: contentData.hero,
    cta: contentData.cta,
    footer: contentData.footer,
    socials: contentData.social,
    projects: contentData.projects,
    "home-project-gallery": contentData.homeProjectGallery,
    icon: contentData.icon,
    services: contentData.services,
    reviews: contentData.reviews,
    stats: contentData.stats,
    clients: contentData.clients,
    tools: contentData.tools,
    categories: contentData.categories,
    "tool-badges": contentData.toolBadges,
};

export function getContentResource(resource: string): unknown | undefined {
    return Object.hasOwn(CONTENT, resource) ? CONTENT[resource as ContentResource] : undefined;
}
