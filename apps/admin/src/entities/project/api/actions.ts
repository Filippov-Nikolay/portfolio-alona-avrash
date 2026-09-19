"use server";

import { revalidatePath } from "next/cache";
import type { Project } from "@avrash/content-schema";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";
import { getImageStorage } from "@/shared/storage/imageStorage";
import {
    createProject,
    deleteProject,
    getProject,
    updateProject,
    type ProjectInput,
} from "./projectsRepository";

// Best-effort storage cleanup for images a project no longer references -
// removed from the gallery then saved, or the whole project deleted. Not a
// full fix for every leaked upload: a file uploaded during editing and then
// abandoned before the first save was never referenced anywhere, so there's
// no "removed from" diff that would ever catch it. That still needs either
// a periodic sweep (list every stored object, delete whichever isn't
// referenced by any saved project) or changing uploads to happen on Save
// instead of on file pick - deliberately out of scope here.
async function deleteProjectImages(images: Project["image"]): Promise<void> {
    const storage = getImageStorage();
    const results = await Promise.allSettled(images.map((image) => storage.delete(image.src)));
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`Failed to delete image "${images[index]!.src}":`, result.reason);
        }
    });
}

export async function createProjectAction(input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const project = await createProject(input);
    revalidatePath("/works/projects");
    await notifyContentChanged("projects");
    return project;
}

export async function updateProjectAction(id: number, input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const previous = await getProject(id);
    const project = await updateProject(id, input);
    revalidatePath("/works/projects");
    revalidatePath(`/works/projects/${id}`);
    await notifyContentChanged("projects");

    if (previous) {
        const keptSrcs = new Set(project.image.map((image) => image.src));
        const removedImages = previous.image.filter((image) => !keptSrcs.has(image.src));
        await deleteProjectImages(removedImages);
    }

    return project;
}

export async function deleteProjectAction(id: number): Promise<void> {
    await requireAdminSession();
    const project = await getProject(id);
    await deleteProject(id);
    revalidatePath("/works/projects");
    await notifyContentChanged("projects");

    if (project) {
        await deleteProjectImages(project.image);
    }
}
