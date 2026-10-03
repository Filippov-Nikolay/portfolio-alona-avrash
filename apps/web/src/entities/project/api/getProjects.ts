import { fetchContent } from "@/shared/api/contentClient";
import type { Project } from "@avrash/content-schema";

export function getProjects(): Promise<Project[]> {
    return fetchContent("projects");
}
