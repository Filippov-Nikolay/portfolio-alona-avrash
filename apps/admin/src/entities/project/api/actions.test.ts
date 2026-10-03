import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, ProjectInput } from "@avrash/content-schema";
import { deleteProjectAction, updateProjectAction } from "./actions";

const mocks = vi.hoisted(() => ({
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    deleteImage: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/auth/requireAdminSession", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/shared/lib/notifyWeb", () => ({ notifyContentChanged: vi.fn() }));
vi.mock("@/shared/storage/imageStorage", () => ({
    getImageStorage: () => ({ delete: mocks.deleteImage }),
}));
vi.mock("./projectsRepository", () => ({
    getProject: mocks.getProject,
    updateProject: mocks.updateProject,
    deleteProject: mocks.deleteProject,
    createProject: vi.fn(),
}));

const gif = {
    id: 1,
    order: 0,
    src: "/projects/uploads/1-loop.gif",
    posterSrc: "/projects/uploads/1-loop-poster.webp",
};
const still = { id: 2, order: 1, src: "/projects/uploads/2-shot.png" };

function makeInput(image: ProjectInput["image"]): ProjectInput {
    return {
        image,
        createdAt: "2024-01-01T00:00:00.000Z",
        name: "Test Project",
        categories: [],
        hover: {
            background: "#000000",
            accentColor: "#ffffff",
            buttonBackground: "#111111",
            buttonTextColor: "#ffffff",
        },
    };
}

const project = (image: ProjectInput["image"]): Project => ({ ...makeInput(image), id: 7 });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteImage.mockResolvedValue(undefined);
});

describe("project image cleanup", () => {
    it("deletes a removed GIF together with its poster", async () => {
        mocks.getProject.mockResolvedValue(project([gif, still]));
        mocks.updateProject.mockResolvedValue(project([still]));

        await updateProjectAction(7, makeInput([still]));

        expect(mocks.deleteImage.mock.calls.map(([src]) => src).sort()).toEqual(
            [gif.src, gif.posterSrc].sort()
        );
    });

    it("deletes every image and poster of a deleted project", async () => {
        mocks.getProject.mockResolvedValue(project([gif, still]));

        await deleteProjectAction(7);

        expect(mocks.deleteImage.mock.calls.map(([src]) => src).sort()).toEqual(
            [gif.src, gif.posterSrc, still.src].sort()
        );
    });
});
