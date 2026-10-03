import { z } from "zod";
import { localized } from "./localized";

export const ReviewI18nSchema = z.object({
    comment: z.string(),
});
export type ReviewI18n = z.infer<typeof ReviewI18nSchema>;

export const ReviewRawSchema = z.object({
    id: z.number().int(),
    nameProject: z.string(),
    name: z.string(),
    i18n: localized(ReviewI18nSchema),
});
export type ReviewRaw = z.infer<typeof ReviewRawSchema>;

export const ReviewsRawSchema = z.array(ReviewRawSchema);

export interface Review {
    id: number;
    nameProject: string;
    comment: string;
    name: string;
}
