import type { z } from "zod";
import { CategoryOptionSchema } from "./category";
import { ClientsConfigSchema } from "./client";
import { CtaContentRawSchema } from "./cta";
import { CvContentSchema } from "./cv";
import { FooterContentRawSchema } from "./footer";
import { HeroContentRawSchema } from "./hero";
import { HomeProjectGalleryConfigSchema } from "./home-project-gallery";
import { IconContentSchema } from "./icon";
import { ProjectSchema } from "./project";
import { ReviewsRawSchema } from "./review";
import { ServicesRawSchema } from "./service";
import { SocialsSchema } from "./social";
import { StatsSchema } from "./stat";
import { ToolBadgeOptionSchema } from "./tool-badge";
import { ToolsSchema } from "./tool";

export const CONTENT_RESOURCES = {
    cv: { file: "cv.json", schema: CvContentSchema },
    hero: { file: "hero.json", schema: HeroContentRawSchema },
    cta: { file: "cta.json", schema: CtaContentRawSchema },
    footer: { file: "footer.json", schema: FooterContentRawSchema },
    socials: { file: "social.json", schema: SocialsSchema },
    projects: { file: "projects.json", schema: ProjectSchema.array() },
    "home-project-gallery": {
        file: "home-project-gallery.json",
        schema: HomeProjectGalleryConfigSchema,
    },
    icon: { file: "icon.json", schema: IconContentSchema },
    services: { file: "services.json", schema: ServicesRawSchema },
    reviews: { file: "reviews.json", schema: ReviewsRawSchema },
    stats: { file: "stats.json", schema: StatsSchema },
    clients: { file: "clients.json", schema: ClientsConfigSchema },
    tools: { file: "tools.json", schema: ToolsSchema },
    categories: { file: "categories.json", schema: CategoryOptionSchema.array() },
    "tool-badges": { file: "tool-badges.json", schema: ToolBadgeOptionSchema.array() },
} as const satisfies Record<string, { file: string; schema: z.ZodType }>;

export type ContentResource = keyof typeof CONTENT_RESOURCES;

export type ContentOf<R extends ContentResource> = z.output<
    (typeof CONTENT_RESOURCES)[R]["schema"]
>;

export function isContentResource(value: string): value is ContentResource {
    return Object.hasOwn(CONTENT_RESOURCES, value);
}
