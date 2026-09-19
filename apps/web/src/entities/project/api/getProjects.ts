import { fetchContent } from "@/shared/api/contentClient";
import { ProjectSchema, type Project } from "@avrash/content-schema";

export function getProjects(): Promise<Project[]> {
    return fetchContent("projects", "projects", ProjectSchema.array());
}
