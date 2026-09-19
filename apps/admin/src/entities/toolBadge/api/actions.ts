"use server";

import { revalidatePath } from "next/cache";
import type { ToolBadgeOption } from "@avrash/content-schema";
import { addOption, removeOption } from "@/entities/optionList/api/optionListRepository";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";

const TOOL_BADGES_FILE = "tool-badges.json";

export async function addToolBadgeAction(label: string): Promise<ToolBadgeOption> {
    await requireAdminSession();
    const option = (await addOption(TOOL_BADGES_FILE, label)) as ToolBadgeOption;
    revalidatePath("/global/tool-badges");
    revalidatePath("/works/projects/new");
    await notifyContentChanged("tool-badges");
    return option;
}

export async function removeToolBadgeAction(key: string): Promise<void> {
    await requireAdminSession();
    const projects = await listProjects();
    const usedBy = projects.filter((project) => project.tools?.includes(key)).length;

    if (usedBy > 0) {
        throw new Error(
            `Used by ${usedBy} project${usedBy === 1 ? "" : "s"} - remove it from ${
                usedBy === 1 ? "that project" : "those projects"
            } first.`
        );
    }

    await removeOption(TOOL_BADGES_FILE, key);
    revalidatePath("/global/tool-badges");
    await notifyContentChanged("tool-badges");
}
