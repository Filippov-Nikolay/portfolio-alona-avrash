import type { CategoryKey } from "@avrash/content-schema";
import type { Project } from "@avrash/content-schema";

const CATEGORY_PRIORITY: CategoryKey[] = ["ui-ux", "web-design", "packaging", "branding", "logo"];

export function getPrimaryCategory(categories: CategoryKey[]): CategoryKey {
    return CATEGORY_PRIORITY.find((key) => categories.includes(key)) ?? categories[0];
}

export interface ProjectGroup {
    category: CategoryKey;
    projects: Project[];
}

export function groupProjectsByPrimaryCategory(projects: Project[]): ProjectGroup[] {
    const groups = new Map<CategoryKey, Project[]>();

    for (const project of projects) {
        const key = getPrimaryCategory(project.categories);
        const list = groups.get(key);
        if (list) list.push(project);
        else groups.set(key, [project]);
    }

    return [...groups.entries()]
        .map(([category, list]) => ({ category, projects: list }))
        .sort((a, b) => b.projects.length - a.projects.length);
}
