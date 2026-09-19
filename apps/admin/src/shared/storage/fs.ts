import { readFile, writeFile } from "node:fs/promises";

export async function readJsonFile<T>(filePath: string): Promise<T> {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await writeFile(filePath, `${JSON.stringify(data, null, 4)}\n`, "utf-8");
}
