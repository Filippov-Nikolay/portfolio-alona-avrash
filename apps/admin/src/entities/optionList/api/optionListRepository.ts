import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { slugify } from "@/shared/lib/slugify";

export type OptionItem = CategoryOption | ToolBadgeOption;

function resolvePath(fileName: string): string {
    return path.join(process.cwd(), "..", "..", "packages", "content-data", "src", fileName);
}

async function readOptions(fileName: string): Promise<OptionItem[]> {
    const raw = await readFile(resolvePath(fileName), "utf-8");
    return JSON.parse(raw) as OptionItem[];
}

async function writeOptions(fileName: string, options: OptionItem[]): Promise<void> {
    await writeFile(resolvePath(fileName), `${JSON.stringify(options, null, 4)}\n`, "utf-8");
}

export async function listOptions(fileName: string): Promise<OptionItem[]> {
    return readOptions(fileName);
}

export async function addOption(fileName: string, label: string): Promise<OptionItem> {
    const trimmed = label.trim();
    const key = slugify(trimmed);

    if (!key) {
        throw new Error("Name must contain at least one letter or number.");
    }

    const options = await readOptions(fileName);
    if (options.some((option) => option.key === key)) {
        throw new Error(`"${trimmed}" already exists.`);
    }

    const option: OptionItem = { key, label: trimmed };
    await writeOptions(fileName, [...options, option]);
    return option;
}

export async function removeOption(fileName: string, key: string): Promise<void> {
    const options = await readOptions(fileName);
    await writeOptions(
        fileName,
        options.filter((option) => option.key !== key)
    );
}
