import { readFile, unlink, writeFile } from "node:fs/promises";

export async function readJsonFile<T>(filePath: string): Promise<T> {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await writeFile(filePath, `${JSON.stringify(data, null, 4)}\n`, "utf-8");
}

export async function deleteFile(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}
