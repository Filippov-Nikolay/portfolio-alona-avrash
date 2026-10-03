import { z } from "zod";

export const MarqueeDirectionSchema = z.enum(["left", "right"]);
export type MarqueeDirection = z.infer<typeof MarqueeDirectionSchema>;

export const ClientPillVariantSchema = z.enum(["outline", "filled", "light"]);
export type ClientPillVariant = z.infer<typeof ClientPillVariantSchema>;

export const ClientSchema = z.object({
    id: z.number().int(),
    name: z.string().min(1),
    variant: ClientPillVariantSchema,
});
export type Client = z.infer<typeof ClientSchema>;

export const ClientsRowSchema = z.object({
    direction: MarqueeDirectionSchema,
    speed: z.number().positive(),
    leadingGap: z.boolean(),
    clients: z.array(ClientSchema),
});
export type ClientsRow = z.infer<typeof ClientsRowSchema>;

export const ClientsConfigSchema = z.object({
    rows: z.array(ClientsRowSchema),
});
export type ClientsConfig = z.infer<typeof ClientsConfigSchema>;
