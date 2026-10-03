import { z } from "zod";
import { localized } from "./localized";
import { ContentImageSchema } from "./project-image";

export const HeroFloatingImageSchema = z.object({
    id: z.string().min(1),
    image: ContentImageSchema,
});
export type HeroFloatingImage = z.infer<typeof HeroFloatingImageSchema>;

export const HeroI18nSchema = z.object({
    description: z.string(),
});
export type HeroI18n = z.infer<typeof HeroI18nSchema>;

export const HeroContentRawSchema = z.object({
    availableForWork: z.boolean(),
    floatingImages: z.array(HeroFloatingImageSchema),
    i18n: localized(HeroI18nSchema),
});
export type HeroContentRaw = z.infer<typeof HeroContentRawSchema>;

export interface HeroContent extends HeroI18n {
    availableForWork: boolean;
    floatingImages: HeroFloatingImage[];
}
