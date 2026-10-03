import { fetchContent } from "@/shared/api/contentClient";
import type { Tool } from "@avrash/content-schema";

export function getTools(): Promise<Tool[]> {
    return fetchContent("tools");
}
