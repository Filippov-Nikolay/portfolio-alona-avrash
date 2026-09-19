import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Project } from "@avrash/content-schema";

const PROJECTS_JSON_PATH = path.join(
    process.cwd(),
    "..",
    "..",
    "packages",
    "content-data",
    "src",
    "projects.json"
);

async function readProjects(): Promise<Project[]> {
    const raw = await readFile(PROJECTS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as Project[];
}

async function writeProjects(projects: Project[]): Promise<void> {
    await writeFile(PROJECTS_JSON_PATH, `${JSON.stringify(projects, null, 4)}\n`, "utf-8");
}

export async function listProjects(): Promise<Project[]> {
    const projects = await readProjects();
    return [...projects].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getProject(id: number): Promise<Project | undefined> {
    const projects = await readProjects();
    return projects.find((project) => project.id === id);
}

export type ProjectInput = Omit<Project, "id">;

export async function createProject(input: ProjectInput): Promise<Project> {
    const projects = await readProjects();
    const nextId = projects.reduce((max, project) => Math.max(max, project.id), -1) + 1;
    const project: Project = { id: nextId, ...input };
    await writeProjects([...projects, project]);
    return project;
}

export async function updateProject(id: number, input: ProjectInput): Promise<Project> {
    const projects = await readProjects();
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) {
        throw new Error(`Project ${id} not found`);
    }
    const updated: Project = { id, ...input };
    projects[index] = updated;
    await writeProjects(projects);
    return updated;
}

export async function deleteProject(id: number): Promise<void> {
    const projects = await readProjects();
    await writeProjects(projects.filter((project) => project.id !== id));
}
