import { z } from "zod";
import { ContentImageSchema } from "./project-image";

export const SocialSchema = z.object({
    id: z.string().min(1),
    logo: ContentImageSchema,
    link: z.string().min(1),
});
export type Social = z.infer<typeof SocialSchema>;

export const SocialsSchema = z.array(SocialSchema);
