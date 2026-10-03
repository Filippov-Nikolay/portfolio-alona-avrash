import { z } from "zod";
import { ContentImageSchema } from "./project-image";

export const ToolSchema = z.object({
    id: z.number().int(),
    name: z.string().min(1),
    // Path to the tool's outline icon (public/assets/tools).
    icon: z.string().min(1),
    // Work samples peeking out behind the card on hover — same shape as
    // entities/home-project-gallery, empty for a tool with none yet.
    images: z.array(ContentImageSchema),
});
export type Tool = z.infer<typeof ToolSchema>;

export const ToolsSchema = z.array(ToolSchema);
