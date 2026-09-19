"use server";

import { revalidatePath } from "next/cache";
import type { Project } from "@avrash/content-schema";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";
import {
    createProject,
    deleteProject,
    updateProject,
    type ProjectInput,
} from "./projectsRepository";

export async function createProjectAction(input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const project = await createProject(input);
    revalidatePath("/works/projects");
    await notifyContentChanged("projects");
    return project;
}

export async function updateProjectAction(id: number, input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const project = await updateProject(id, input);
    revalidatePath("/works/projects");
    revalidatePath(`/works/projects/${id}`);
    await notifyContentChanged("projects");
    return project;
}

export async function deleteProjectAction(id: number): Promise<void> {
    await requireAdminSession();
    await deleteProject(id);
    revalidatePath("/works/projects");
    await notifyContentChanged("projects");
}
