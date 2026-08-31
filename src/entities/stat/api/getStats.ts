import { fetchContent } from "@/shared/api/contentClient";
import type { StatItem } from "../model/stat";

export function getStats(): Promise<StatItem[]> {
    return fetchContent<StatItem[]>("stats", "stats");
}
