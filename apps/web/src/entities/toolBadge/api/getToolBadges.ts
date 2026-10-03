import { fetchContent } from "@/shared/api/contentClient";
import type { ToolBadgeOption } from "@avrash/content-schema";

export function getToolBadges(): Promise<ToolBadgeOption[]> {
    return fetchContent("tool-badges");
}
