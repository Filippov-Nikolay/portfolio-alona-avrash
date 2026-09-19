"use server";

import { revalidatePath } from "next/cache";
import type { CategoryOption } from "@avrash/content-schema";
import { addOption, removeOption } from "@/entities/optionList/api/optionListRepository";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";

const CATEGORIES_FILE = "categories.json";

export async function addCategoryAction(label: string): Promise<CategoryOption> {
    await requireAdminSession();
    const option = (await addOption(CATEGORIES_FILE, label)) as CategoryOption;
    revalidatePath("/global/categories");
    revalidatePath("/works/projects/new");
    await notifyContentChanged("categories");
    return option;
}

export async function removeCategoryAction(key: string): Promise<void> {
    await requireAdminSession();
    const projects = await listProjects();
    const usedBy = projects.filter((project) =>
        (project.categories as string[]).includes(key)
    ).length;

    if (usedBy > 0) {
        throw new Error(
            `Used by ${usedBy} project${usedBy === 1 ? "" : "s"} - remove it from ${
                usedBy === 1 ? "that project" : "those projects"
            } first.`
        );
    }

    await removeOption(CATEGORIES_FILE, key);
    revalidatePath("/global/categories");
    await notifyContentChanged("categories");
}
