import { describe, expect, it } from "vitest";
import type { Project } from "@avrash/content-schema";
import { createProjectsRepository, type ProjectInput } from "./projectsRepository";

function makeInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
    return {
        image: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        name: "Test Project",
        categories: [],
        hover: {
            background: "#000000",
            accentColor: "#ffffff",
            buttonBackground: "#111111",
            buttonTextColor: "#ffffff",
        },
        ...overrides,
    };
}

function makeFakeRepository(seed: Project[] = []) {
    let store = [...seed];
    const repository = createProjectsRepository(
        async () => store,
        async (projects) => {
            store = projects;
        }
    );
    return { repository, getStore: () => store };
}

describe("projectsRepository", () => {
    describe("list", () => {
        it("returns projects sorted by createdAt, newest first", async () => {
            const { repository } = makeFakeRepository([
                { ...makeInput({ createdAt: "2024-01-01T00:00:00.000Z" }), id: 0 },
                { ...makeInput({ createdAt: "2024-06-01T00:00:00.000Z" }), id: 1 },
                { ...makeInput({ createdAt: "2024-03-01T00:00:00.000Z" }), id: 2 },
            ]);

            const projects = await repository.list();

            expect(projects.map((project) => project.id)).toEqual([1, 2, 0]);
        });

        it("does not mutate the underlying store", async () => {
            const { repository, getStore } = makeFakeRepository([
                { ...makeInput({ createdAt: "2024-01-01T00:00:00.000Z" }), id: 0 },
                { ...makeInput({ createdAt: "2024-06-01T00:00:00.000Z" }), id: 1 },
            ]);

            await repository.list();

            expect(getStore().map((project) => project.id)).toEqual([0, 1]);
        });
    });

    describe("get", () => {
        it("returns the matching project", async () => {
            const { repository } = makeFakeRepository([{ ...makeInput(), id: 5 }]);
            await expect(repository.get(5)).resolves.toMatchObject({ id: 5 });
        });

        it("returns undefined for an id that doesn't exist", async () => {
            const { repository } = makeFakeRepository([{ ...makeInput(), id: 5 }]);
            await expect(repository.get(999)).resolves.toBeUndefined();
        });
    });

    describe("create", () => {
        it("assigns id 0 to the first project", async () => {
            const { repository } = makeFakeRepository([]);
            const project = await repository.create(makeInput());
            expect(project.id).toBe(0);
        });

        it("assigns the next id after the current maximum", async () => {
            const { repository } = makeFakeRepository([
                { ...makeInput(), id: 0 },
                { ...makeInput(), id: 4 },
            ]);
            const project = await repository.create(makeInput());
            expect(project.id).toBe(5);
        });

        it("persists the new project alongside the existing ones", async () => {
            const { repository, getStore } = makeFakeRepository([{ ...makeInput(), id: 0 }]);
            await repository.create(makeInput({ name: "New One" }));
            expect(getStore()).toHaveLength(2);
        });
    });

    describe("update", () => {
        it("replaces the project's fields but keeps its id", async () => {
            const { repository } = makeFakeRepository([
                { ...makeInput({ name: "Old Name" }), id: 3 },
            ]);

            const updated = await repository.update(3, makeInput({ name: "New Name" }));

            expect(updated).toMatchObject({ id: 3, name: "New Name" });
        });

        it("throws for an id that doesn't exist", async () => {
            const { repository } = makeFakeRepository([{ ...makeInput(), id: 0 }]);
            await expect(repository.update(999, makeInput())).rejects.toThrow(
                "Project 999 not found"
            );
        });
    });

    describe("delete", () => {
        it("removes only the targeted project", async () => {
            const { repository, getStore } = makeFakeRepository([
                { ...makeInput(), id: 0 },
                { ...makeInput(), id: 1 },
            ]);

            await repository.delete(0);

            expect(getStore().map((project) => project.id)).toEqual([1]);
        });

        it("is a no-op for an id that doesn't exist", async () => {
            const { repository, getStore } = makeFakeRepository([{ ...makeInput(), id: 0 }]);
            await repository.delete(999);
            expect(getStore()).toHaveLength(1);
        });
    });
});
