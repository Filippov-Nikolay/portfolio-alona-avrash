import { describe, expect, it } from "vitest";
import type { OptionItem } from "./optionListRepository";
import { createOptionListRepository } from "./optionListRepository";

const FILE = "categories.json";

function makeFakeRepository(seed: OptionItem[] = []) {
    let store = [...seed];
    const repository = createOptionListRepository(
        async () => store,
        async (_fileName, options) => {
            store = options;
        }
    );
    return { repository, getStore: () => store };
}

describe("optionListRepository", () => {
    describe("add", () => {
        it("slugifies the label into the key and trims the stored label", async () => {
            const { repository } = makeFakeRepository();
            const option = await repository.add(FILE, "  Brand Identity  ");
            expect(option).toEqual({ key: "brand-identity", label: "Brand Identity" });
        });

        it("persists the new option alongside existing ones", async () => {
            const { repository, getStore } = makeFakeRepository([
                { key: "packaging", label: "Packaging" },
            ]);
            await repository.add(FILE, "Branding");
            expect(getStore().map((option) => option.key)).toEqual(["packaging", "branding"]);
        });

        it("rejects a label that slugifies to an existing key", async () => {
            const { repository } = makeFakeRepository([{ key: "branding", label: "Branding" }]);
            await expect(repository.add(FILE, "branding")).rejects.toThrow(
                '"branding" already exists.'
            );
        });

        it("rejects a label with no letters or digits", async () => {
            const { repository } = makeFakeRepository();
            await expect(repository.add(FILE, "  ---  ")).rejects.toThrow(
                "Name must contain at least one letter or number."
            );
        });
    });

    describe("remove", () => {
        it("removes only the option with the matching key", async () => {
            const { repository, getStore } = makeFakeRepository([
                { key: "branding", label: "Branding" },
                { key: "packaging", label: "Packaging" },
            ]);

            await repository.remove(FILE, "branding");

            expect(getStore().map((option) => option.key)).toEqual(["packaging"]);
        });

        it("is a no-op for a key that doesn't exist", async () => {
            const { repository, getStore } = makeFakeRepository([
                { key: "branding", label: "Branding" },
            ]);
            await repository.remove(FILE, "unknown");
            expect(getStore()).toHaveLength(1);
        });
    });
});
