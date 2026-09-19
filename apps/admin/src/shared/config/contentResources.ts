import * as contentData from "@avrash/content-data";

type ContentDataKey = keyof typeof contentData;

const RESOURCE_BY_PAGE_SECTION: Record<string, Record<string, ContentDataKey>> = {
    home: {
        hero: "hero",
        stats: "stats",
        services: "services",
        projects: "homeProjectGallery",
        clients: "clients",
        tools: "tools",
        reviews: "reviews",
        cta: "cta",
    },
    // works/projects has its own route (app/works/projects) with a real
    // list/edit UI now, not the generic JSON viewer - nothing to map here.
    works: {},
    contact: {},
    global: {
        socials: "social",
        footer: "footer",
    },
};

export function getSectionContent(pageSlug: string, sectionSlug: string): unknown | undefined {
    const key = RESOURCE_BY_PAGE_SECTION[pageSlug]?.[sectionSlug];
    return key ? contentData[key] : undefined;
}
