import { fetchContent } from "@/shared/api/contentClient";
import type { StatItem } from "@avrash/content-schema";

export function getStats(): Promise<StatItem[]> {
    return fetchContent<StatItem[]>("stats", "stats");
}
