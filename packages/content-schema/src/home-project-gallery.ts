import { z } from "zod";
import { ContentImageSchema } from "./project-image";

export const HomeProjectGalleryCardSchema = z.object({
    image: ContentImageSchema,
});
export type HomeProjectGalleryCard = z.infer<typeof HomeProjectGalleryCardSchema>;

export const HomeProjectGalleryConfigSchema = z.object({
    visibleCardCount: z.number().int().positive(),
    cards: z.array(HomeProjectGalleryCardSchema),
});
export type HomeProjectGalleryConfig = z.infer<typeof HomeProjectGalleryConfigSchema>;
