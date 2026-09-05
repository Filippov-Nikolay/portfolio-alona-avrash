import { fetchContent } from "@/shared/api/contentClient";
import type { Tool } from "../model/tool";

export function getTools(): Promise<Tool[]> {
    return fetchContent<Tool[]>("tools", "tools");
}
