import path from "node:path";
import type { Project } from "@avrash/content-schema";
import { getStorageDriver } from "@/shared/storage/driver";
import { readJsonFile, writeJsonFile } from "@/shared/storage/fs";
import { readJsonObject, writeJsonObject } from "@/shared/storage/r2";

export type ProjectInput = Omit<Project, "id">;

export interface ProjectsRepository {
    list(): Promise<Project[]>;
    get(id: number): Promise<Project | undefined>;
    create(input: ProjectInput): Promise<Project>;
    update(id: number, input: ProjectInput): Promise<Project>;
    delete(id: number): Promise<void>;
}

function nextId(projects: Project[]): number {
    return projects.reduce((max, project) => Math.max(max, project.id), -1) + 1;
}

function createProjectsRepository(
    readAll: () => Promise<Project[]>,
    writeAll: (projects: Project[]) => Promise<void>
): ProjectsRepository {
    return {
        async list() {
            const projects = await readAll();
            return [...projects].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        },
        async get(id) {
            const projects = await readAll();
            return projects.find((project) => project.id === id);
        },
        async create(input) {
            const projects = await readAll();
            const project: Project = { id: nextId(projects), ...input };
            await writeAll([...projects, project]);
            return project;
        },
        async update(id, input) {
            const projects = await readAll();
            const index = projects.findIndex((project) => project.id === id);
            if (index === -1) {
                throw new Error(`Project ${id} not found`);
            }
            const updated: Project = { id, ...input };
            projects[index] = updated;
            await writeAll(projects);
            return updated;
        },
        async delete(id) {
            const projects = await readAll();
            await writeAll(projects.filter((project) => project.id !== id));
        },
    };
}

const PROJECTS_JSON_PATH = path.join(
    process.cwd(),
    "..",
    "..",
    "packages",
    "content-data",
    "src",
    "projects.json"
);
const PROJECTS_R2_KEY = "content/projects.json";

const fileSystemProjectsRepository = createProjectsRepository(
    () => readJsonFile<Project[]>(PROJECTS_JSON_PATH),
    (projects) => writeJsonFile(PROJECTS_JSON_PATH, projects)
);

const r2ProjectsRepository = createProjectsRepository(
    () => readJsonObject<Project[]>(PROJECTS_R2_KEY),
    (projects) => writeJsonObject(PROJECTS_R2_KEY, projects)
);

function getProjectsRepository(): ProjectsRepository {
    return getStorageDriver() === "r2" ? r2ProjectsRepository : fileSystemProjectsRepository;
}

export async function listProjects(): Promise<Project[]> {
    return getProjectsRepository().list();
}

export async function getProject(id: number): Promise<Project | undefined> {
    return getProjectsRepository().get(id);
}

export async function createProject(input: ProjectInput): Promise<Project> {
    return getProjectsRepository().create(input);
}

export async function updateProject(id: number, input: ProjectInput): Promise<Project> {
    return getProjectsRepository().update(id, input);
}

export async function deleteProject(id: number): Promise<void> {
    return getProjectsRepository().delete(id);
}
