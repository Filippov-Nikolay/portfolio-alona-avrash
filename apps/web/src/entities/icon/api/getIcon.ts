import { fetchContent } from "@/shared/api/contentClient";
import type { IconContent } from "@avrash/content-schema";

export function getIcon(): Promise<IconContent> {
    return fetchContent<IconContent>("icon", "icon");
}
