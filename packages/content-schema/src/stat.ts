import { z } from "zod";

export const StatItemSchema = z.object({
    id: z.number().int(),
    value: z.string().min(1),
    label: z.string(),
});
export type StatItem = z.infer<typeof StatItemSchema>;

export const StatsSchema = z.array(StatItemSchema);
