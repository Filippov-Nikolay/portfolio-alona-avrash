"use server";

import { revalidatePath } from "next/cache";
import type { Project } from "@avrash/content-schema";
import {
    createProject,
    deleteProject,
    updateProject,
    type ProjectInput,
} from "./projectsRepository";

export async function createProjectAction(input: ProjectInput): Promise<Project> {
    const project = await createProject(input);
    revalidatePath("/works/projects");
    return project;
}

export async function updateProjectAction(id: number, input: ProjectInput): Promise<Project> {
    const project = await updateProject(id, input);
    revalidatePath("/works/projects");
    revalidatePath(`/works/projects/${id}`);
    return project;
}

export async function deleteProjectAction(id: number): Promise<void> {
    await deleteProject(id);
    revalidatePath("/works/projects");
}
