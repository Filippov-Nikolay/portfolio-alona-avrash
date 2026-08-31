import { fetchContent } from "@/shared/api/contentClient";
import type { Project } from "../model/project";

export function getProjects(): Promise<Project[]> {
    return fetchContent<Project[]>("projects", "projects");
}
