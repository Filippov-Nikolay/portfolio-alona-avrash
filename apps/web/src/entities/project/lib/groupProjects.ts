import type { CategoryKey } from "@avrash/content-schema";
import type { Project } from "@avrash/content-schema";

// `categoryPriority` is the order categories.json lists categories in -
// the first one a project has, in that order, wins as its "primary"
// category for grouping/filtering. Was a fixed array here; now passed in
// since the admin's Global > Categories page can add more at runtime.
export function getPrimaryCategory(
    categories: CategoryKey[],
    categoryPriority: CategoryKey[]
): CategoryKey {
    return categoryPriority.find((key) => categories.includes(key)) ?? categories[0];
}

export interface ProjectGroup {
    category: CategoryKey;
    projects: Project[];
}

export function groupProjectsByPrimaryCategory(
    projects: Project[],
    categoryPriority: CategoryKey[]
): ProjectGroup[] {
    const groups = new Map<CategoryKey, Project[]>();

    for (const project of projects) {
        const key = getPrimaryCategory(project.categories, categoryPriority);
        const list = groups.get(key);
        if (list) list.push(project);
        else groups.set(key, [project]);
    }

    return [...groups.entries()]
        .map(([category, list]) => ({ category, projects: list }))
        .sort((a, b) => b.projects.length - a.projects.length);
}
