import { readdirSync, readFileSync } from "node:fs";
import { CONTENT_RESOURCES } from "@avrash/content-schema";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const directory = new URL("./", import.meta.url);
const read = (file: string): unknown => JSON.parse(readFileSync(new URL(file, directory), "utf-8"));

describe("bundled content", () => {
    it.each(Object.entries(CONTENT_RESOURCES))("%s matches its schema", (_name, resource) => {
        const result = resource.schema.safeParse(read(resource.file));
        expect(result.success, result.success ? "" : z.prettifyError(result.error)).toBe(true);
    });

    it("registers every content file and nothing else", () => {
        const files = readdirSync(directory)
            .filter((file) => file.endsWith(".json"))
            .sort();
        const registered = Object.values(CONTENT_RESOURCES)
            .map((resource) => resource.file)
            .sort();
        expect(files).toEqual(registered);
    });
});
