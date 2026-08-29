import type { ShowcaseItem } from "@/shared/types";
import type { Project } from "../model/project";
import projectsData from "../model/projects.json";

const COLOR_ROTATION = ["purple", "blue", "orange"] as const;

export function getAllProjects(): Project[] {
    return [...(projectsData as Project[])].sort(
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
