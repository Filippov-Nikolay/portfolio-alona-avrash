import type { ShowcaseItem } from "@/shared/types";
import type { Project } from "../model/project";
import { getProjects } from "../api/getProjects";

const COLOR_ROTATION = ["purple", "blue", "orange"] as const;

export async function getAllProjects(): Promise<Project[]> {
    const projects = await getProjects();
    return [...projects].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function toShowcaseItem(
    project: Project,
    index: number,
    translateCategory: (key: Project["categories"][number]) => string,
    featured: boolean
): ShowcaseItem {
    const heroImage = project.image.find((image) => image.isHero) ?? project.image[0];

    return {
        id: project.id,
        title: project.name,
        category: project.categories.map(translateCategory).join(" · "),
        color: COLOR_ROTATION[index % COLOR_ROTATION.length],
        tags: project.categories,
        src: heroImage?.src,
        featured,
    };
}
