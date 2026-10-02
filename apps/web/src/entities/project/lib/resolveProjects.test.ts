import { describe, expect, it, vi } from "vitest";
import type { CategoryKey, Project, ToolBadgeOption } from "@avrash/content-schema";

const { getProjects } = vi.hoisted(() => ({ getProjects: vi.fn() }));
vi.mock("../api/getProjects", () => ({ getProjects }));

const { getAllProjects, getSelectedWork, toShowcaseItem } = await import("./resolveProjects");

function makeProject(overrides: Partial<Project> = {}): Project {
    return {
        id: 1,
        image: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        name: "Cafe Rebrand",
        categories: ["branding"] as CategoryKey[],
        hover: {
            background: "#111111",
            accentColor: "#ffffff",
            buttonBackground: "#222222",
            buttonTextColor: "#ffffff",
        },
        ...overrides,
    };
}

describe("getAllProjects", () => {
    it("sorts fetched projects by createdAt, newest first", async () => {
        getProjects.mockResolvedValueOnce([
            makeProject({ id: 1, createdAt: "2024-01-01T00:00:00.000Z" }),
            makeProject({ id: 2, createdAt: "2024-06-01T00:00:00.000Z" }),
        ]);

        const projects = await getAllProjects();

        expect(projects.map((project) => project.id)).toEqual([2, 1]);
    });
});

describe("getSelectedWork", () => {
    it("keeps only projects with selectedWork, sorted by rank", () => {
        const projects = [
            makeProject({ id: 1, selectedWork: { rank: 2 } }),
            makeProject({ id: 2 }),
            makeProject({ id: 3, selectedWork: { rank: 1 } }),
        ];

        const selected = getSelectedWork(projects);

        expect(selected.map((project) => project.id)).toEqual([3, 1]);
    });

    it("respects the limit", () => {
        const projects = [
            makeProject({ id: 1, selectedWork: { rank: 1 } }),
            makeProject({ id: 2, selectedWork: { rank: 2 } }),
            makeProject({ id: 3, selectedWork: { rank: 3 } }),
        ];

        expect(getSelectedWork(projects, 2)).toHaveLength(2);
    });
});

describe("toShowcaseItem", () => {
    const translate = (key: CategoryKey) => key.toUpperCase();

    it("provides same-origin GIF previews even for CDN artwork", () => {
        const item = toShowcaseItem(
            makeProject({
                image: [
                    { id: 1, order: 0, src: "https://cdn.test/projects/a.gif" },
                    { id: 2, order: 1, src: "/projects/b.png" },
                ],
            }),
            0,
            translate,
            false,
            []
        );
        expect(item.gallery[0].posterSrc).toBe(
            "/api/gallery-poster?src=https%3A%2F%2Fcdn.test%2Fprojects%2Fa.gif"
        );
        expect(item.gallery[1].posterSrc).toBeUndefined();
    });

    it("picks the isHero image as src, falling back to the first image", () => {
        const withHero = toShowcaseItem(
            makeProject({
                image: [
                    { id: 1, order: 0, src: "/a.webp" },
                    { id: 2, order: 1, src: "/b.webp", isHero: true },
                ],
            }),
            0,
            translate,
            false,
            []
        );
        expect(withHero.src).toBe("/b.webp");

        const withoutHero = toShowcaseItem(
            makeProject({
                image: [
                    { id: 1, order: 0, src: "/first.webp" },
                    { id: 2, order: 1, src: "/second.webp" },
                ],
            }),
            0,
            translate,
            false,
            []
        );
        expect(withoutHero.src).toBe("/first.webp");
    });

    it("builds the gallery from non-hero images, sorted by order", () => {
        const item = toShowcaseItem(
            makeProject({
                image: [
                    { id: 1, order: 2, src: "/c.webp" },
                    { id: 2, order: 0, src: "/a.webp", isHero: true },
                    { id: 3, order: 1, src: "/b.webp" },
                ],
            }),
            0,
            translate,
            false,
            []
        );
        expect(item.gallery.map((image) => image.src)).toEqual(["/b.webp", "/c.webp"]);
    });

    it("joins translated categories with a middle dot", () => {
        const item = toShowcaseItem(
            makeProject({ categories: ["branding", "packaging"] as CategoryKey[] }),
            0,
            translate,
            false,
            []
        );
        expect(item.category).toBe("BRANDING · PACKAGING");
    });

    it("rotates card color by index, wrapping around", () => {
        const colors = [0, 1, 2, 3].map(
            (index) => toShowcaseItem(makeProject(), index, translate, false, []).color
        );
        expect(colors).toEqual(["purple", "blue", "orange", "purple"]);
    });

    it("resolves tools only when the project has some", () => {
        const catalog: ToolBadgeOption[] = [{ key: "custom-tool", label: "Custom Tool" }];

        const withTools = toShowcaseItem(
            makeProject({ tools: ["custom-tool"] }),
            0,
            translate,
            false,
            catalog
        );
        expect(withTools.tools).toHaveLength(1);

        const withoutTools = toShowcaseItem(makeProject(), 0, translate, false, catalog);
        expect(withoutTools.tools).toBeUndefined();
    });

    it("falls back to hover.background when accentColorModal is unset", () => {
        const item = toShowcaseItem(
            makeProject({ hover: { ...makeProject().hover, background: "#abcdef" } }),
            0,
            translate,
            false,
            []
        );
        expect(item.accentColorModal).toBe("#abcdef");
    });

    it("passes featured through unchanged", () => {
        expect(toShowcaseItem(makeProject(), 0, translate, true, []).featured).toBe(true);
        expect(toShowcaseItem(makeProject(), 0, translate, false, []).featured).toBe(false);
    });
});
