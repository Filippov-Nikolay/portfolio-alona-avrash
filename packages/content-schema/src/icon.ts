import { z } from "zod";

export const IconContentSchema = z.object({
    src: z.string().min(1),
});
export type IconContent = z.infer<typeof IconContentSchema>;
