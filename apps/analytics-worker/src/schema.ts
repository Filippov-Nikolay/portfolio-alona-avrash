import { z } from "zod";

export const ANALYTICS_EVENTS = [
    "project_open",
    "project_gallery_view",
    "project_external_click",
    "works_filter",
    "cv_download",
    "contact_started",
    "contact_success",
    "social_click",
    "page_view",
] as const;

export const AnalyticsEventBodySchema = z.object({
    eventName: z.enum(ANALYTICS_EVENTS),
    entityId: z.string().trim().min(1).max(200).optional(),
    path: z.string().trim().min(1).max(500),
    locale: z.string().trim().min(1).max(20),
    sessionId: z.uuid(),
    referrer: z.string().trim().max(500).optional(),
});

export type AnalyticsEventBody = z.infer<typeof AnalyticsEventBodySchema>;
