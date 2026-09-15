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

const DEFAULT_SELECTED_WORK_LIMIT = 3;

export function getSelectedWork(
    projects: Project[],
    limit = DEFAULT_SELECTED_WORK_LIMIT
): Project[] {
    return projects
        .filter(
            (
                project
            ): project is Project & { selectedWork: NonNullable<Project["selectedWork"]> } =>
                Boolean(project.selectedWork)
        )
        .sort((a, b) => a.selectedWork.rank - b.selectedWork.rank)
        .slice(0, limit);
}

export function toShowcaseItem(
    project: Project,
    index: number,
    translateCategory: (key: Project["categories"][number]) => string,
    featured: boolean
): ShowcaseItem {
    const heroImage = project.image.find((image) => image.isHero) ?? project.image[0];
    const gallery = project.image
        .filter((image) => !image.isHero)
        .sort((a, b) => a.order - b.order)
        .map((image) => ({ src: image.src, alt: image.alt ?? project.name }));

    return {
        id: project.id,
        title: project.name,
        category: project.categories.map(translateCategory).join(" · "),
        color: COLOR_ROTATION[index % COLOR_ROTATION.length],
        tags: project.categories,
        src: heroImage?.src,
        featured,
        gallery,
        tools: project.tools,
        websiteUrl: project.websiteUrl,
        accentColorModal: project.accentColorModal ?? project.hover.background,
    };
}
