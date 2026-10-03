import { z } from "zod";
import { CategoryKeySchema } from "./category";
import { localized } from "./localized";
import { ContentImageSchema } from "./project-image";

export const ServiceI18nSchema = z.object({
    description: z.string(),
    approachLabel: z.string(),
});
export type ServiceI18n = z.infer<typeof ServiceI18nSchema>;

export const ServiceRawSchema = z.object({
    id: z.number().int(),
    title: CategoryKeySchema,
    image: ContentImageSchema,
    i18n: localized(ServiceI18nSchema),
});
export type ServiceRaw = z.infer<typeof ServiceRawSchema>;

export const ServicesRawSchema = z.array(ServiceRawSchema);

export interface Service extends ServiceI18n {
    id: number;
    title: string;
    image: ServiceRaw["image"];
}
