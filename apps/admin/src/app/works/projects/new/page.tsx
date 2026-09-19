import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { listOptions } from "@/entities/optionList/api/optionListRepository";
import { ProjectForm } from "@/widgets/ProjectForm";

export default async function NewProjectPage() {
    const [categoryOptions, toolOptions] = await Promise.all([
        listOptions("categories.json") as Promise<CategoryOption[]>,
        listOptions("tool-badges.json") as Promise<ToolBadgeOption[]>,
    ]);

    return <ProjectForm categoryOptions={categoryOptions} toolOptions={toolOptions} />;
}
