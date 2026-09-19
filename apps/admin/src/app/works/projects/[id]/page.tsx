import { notFound } from "next/navigation";
import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { getProject } from "@/entities/project/api/projectsRepository";
import { listOptions } from "@/entities/optionList/api/optionListRepository";
import { ProjectForm } from "@/widgets/ProjectForm";

interface EditProjectPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
    const { id } = await params;
    const projectId = Number(id);

    if (!Number.isInteger(projectId)) {
        notFound();
    }

    const [project, categoryOptions, toolOptions] = await Promise.all([
        getProject(projectId),
        listOptions("categories.json") as Promise<CategoryOption[]>,
        listOptions("tool-badges.json") as Promise<ToolBadgeOption[]>,
    ]);

    if (!project) {
        notFound();
    }

    return (
        <ProjectForm
            project={project}
            categoryOptions={categoryOptions}
            toolOptions={toolOptions}
        />
    );
}
