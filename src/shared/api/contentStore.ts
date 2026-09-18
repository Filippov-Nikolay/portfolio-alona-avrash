import heroData from "@/entities/hero/model/hero.json";
import ctaData from "@/entities/cta/model/cta.json";
import footerData from "@/entities/footer/model/footer.json";
import socialData from "@/entities/social/model/social.json";
import projectsData from "@/entities/project/model/projects.json";
import homeProjectGalleryData from "@/entities/home-project-gallery/model/home-project-gallery.json";
import servicesData from "@/entities/service/model/services.json";
import reviewsData from "@/entities/review/model/reviews.json";
import statsData from "@/entities/stat/model/stats.json";
import clientsData from "@/entities/client/model/clients.json";
import toolsData from "@/entities/tool/model/tools.json";

const CONTENT: Record<string, unknown> = {
    hero: heroData,
    cta: ctaData,
    footer: footerData,
    socials: socialData,
    projects: projectsData,
    "home-project-gallery": homeProjectGalleryData,
    services: servicesData,
    reviews: reviewsData,
    stats: statsData,
    clients: clientsData,
    tools: toolsData,
};

export function getContentResource(resource: string): unknown | undefined {
    return CONTENT[resource];
}
