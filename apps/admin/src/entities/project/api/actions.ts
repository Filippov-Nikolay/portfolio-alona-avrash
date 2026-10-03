"use server";

import { revalidatePath } from "next/cache";
import { ProjectInputSchema, type Project, type ProjectInput } from "@avrash/content-schema";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { formatZodError } from "@/shared/lib/formatZodError";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";
import { getImageStorage } from "@/shared/storage/imageStorage";
import { createProject, deleteProject, getProject, updateProject } from "./projectsRepository";

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
    const sources = images.flatMap((image) =>
        image.posterSrc ? [image.src, image.posterSrc] : [image.src]
    );
    const results = await Promise.allSettled(sources.map((src) => storage.delete(src)));
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`Failed to delete image "${sources[index]!}":`, result.reason);
        }
    });
}

// TypeScript's ProjectInput type only protects the code that calls this
// action - it says nothing about what the client actually sends over the
// wire when a Server Action is invoked. Parsing here means a malformed
// payload fails with a clear message before it ever reaches the repository
// or gets written to R2, instead of silently corrupting saved content.
function parseProjectInput(input: ProjectInput): ProjectInput {
    const result = ProjectInputSchema.safeParse(input);
    if (!result.success) {
        throw new Error(`Invalid project data: ${formatZodError(result.error)}`);
    }
    return result.data;
}

export async function createProjectAction(input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const project = await createProject(parseProjectInput(input));
    revalidatePath("/works/projects");
    await notifyContentChanged("projects");
    return project;
}

export async function updateProjectAction(id: number, input: ProjectInput): Promise<Project> {
    await requireAdminSession();
    const parsedInput = parseProjectInput(input);
    const previous = await getProject(id);
    const project = await updateProject(id, parsedInput);
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
