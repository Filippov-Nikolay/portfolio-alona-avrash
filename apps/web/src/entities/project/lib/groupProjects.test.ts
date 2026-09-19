import { describe, expect, it } from "vitest";
import type { CategoryKey, Project } from "@avrash/content-schema";
import { getPrimaryCategory, groupProjectsByPrimaryCategory } from "./groupProjects";

const PRIORITY = ["branding", "packaging", "digital"] as CategoryKey[];

function makeProject(id: number, categories: CategoryKey[]): Project {
    return {
        id,
        image: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        name: `Project ${id}`,
        categories,
        hover: {
            background: "#000",
            accentColor: "#fff",
            buttonBackground: "#111",
            buttonTextColor: "#fff",
        },
    };
}

describe("getPrimaryCategory", () => {
    it("picks the earliest category in priority order", () => {
        const category = getPrimaryCategory(["digital", "branding"] as CategoryKey[], PRIORITY);
        expect(category).toBe("branding");
    });

    it("falls back to the project's first category when none is in the priority list", () => {
        const category = getPrimaryCategory(["motion", "sound"] as CategoryKey[], PRIORITY);
        expect(category).toBe("motion");
    });
});

describe("groupProjectsByPrimaryCategory", () => {
    it("groups projects under their primary category", () => {
        const projects = [
            makeProject(1, ["branding"] as CategoryKey[]),
            makeProject(2, ["packaging"] as CategoryKey[]),
            makeProject(3, ["branding", "digital"] as CategoryKey[]),
        ];

        const groups = groupProjectsByPrimaryCategory(projects, PRIORITY);
        const branding = groups.find((group) => group.category === "branding");

        expect(branding?.projects.map((project) => project.id)).toEqual([1, 3]);
    });

    it("sorts groups by size, largest first", () => {
        const projects = [
            makeProject(1, ["branding"] as CategoryKey[]),
            makeProject(2, ["packaging"] as CategoryKey[]),
            makeProject(3, ["packaging"] as CategoryKey[]),
            makeProject(4, ["packaging"] as CategoryKey[]),
        ];

        const groups = groupProjectsByPrimaryCategory(projects, PRIORITY);

        expect(groups.map((group) => group.category)).toEqual(["packaging", "branding"]);
    });
});
