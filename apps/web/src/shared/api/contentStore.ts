import * as contentData from "@avrash/content-data";

const CONTENT: Record<string, unknown> = {
    hero: contentData.hero,
    cta: contentData.cta,
    footer: contentData.footer,
    socials: contentData.social,
    projects: contentData.projects,
    "home-project-gallery": contentData.homeProjectGallery,
    services: contentData.services,
    reviews: contentData.reviews,
    stats: contentData.stats,
    clients: contentData.clients,
    tools: contentData.tools,
    categories: contentData.categories,
    "tool-badges": contentData.toolBadges,
};

export function getContentResource(resource: string): unknown | undefined {
    return CONTENT[resource];
}
