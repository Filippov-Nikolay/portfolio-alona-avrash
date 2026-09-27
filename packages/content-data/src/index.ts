import type {
    HeroContentRaw,
    CtaContentRaw,
    FooterContentRaw,
    Social,
    Project,
    HomeProjectGalleryConfig,
    IconContent,
    ServiceRaw,
    ReviewRaw,
    StatItem,
    ClientsConfig,
    Tool,
    CategoryOption,
    ToolBadgeOption,
    CvDocument,
} from "@avrash/content-schema";

import heroJson from "./hero.json";
import ctaJson from "./cta.json";
import footerJson from "./footer.json";
import socialJson from "./social.json";
import projectsJson from "./projects.json";
import homeProjectGalleryJson from "./home-project-gallery.json";
import iconJson from "./icon.json";
import servicesJson from "./services.json";
import reviewsJson from "./reviews.json";
import statsJson from "./stats.json";
import clientsJson from "./clients.json";
import toolsJson from "./tools.json";
import categoriesJson from "./categories.json";
import toolBadgesJson from "./tool-badges.json";
import cvJson from "./cv.json";

export const cv = cvJson as CvDocument | null;

// hero.floatingImages[].image and service.image are single standalone
// images, not gallery entries - they reuse ProjectImage for its src/alt
// shape but never carry id/order, so the JSON genuinely doesn't satisfy
// it structurally. Pre-existing looseness in the schema, not new here.
export const hero = heroJson as unknown as HeroContentRaw;
export const cta = ctaJson as CtaContentRaw;
export const footer = footerJson as FooterContentRaw;
export const social = socialJson as Social[];
export const projects = projectsJson as Project[];
export const homeProjectGallery = homeProjectGalleryJson as HomeProjectGalleryConfig;
export const icon = iconJson as IconContent;
export const services = servicesJson as unknown as ServiceRaw[];
export const reviews = reviewsJson as ReviewRaw[];
export const stats = statsJson as StatItem[];
export const clients = clientsJson as ClientsConfig;
export const tools = toolsJson as Tool[];
export const categories = categoriesJson as CategoryOption[];
export const toolBadges = toolBadgesJson as ToolBadgeOption[];
