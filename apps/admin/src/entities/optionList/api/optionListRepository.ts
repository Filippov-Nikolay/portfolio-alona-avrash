import path from "node:path";
import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { slugify } from "@/shared/lib/slugify";
import { getStorageDriver } from "@/shared/storage/driver";
import { readJsonFile, writeJsonFile } from "@/shared/storage/fs";
import { readJsonObject, writeJsonObject } from "@/shared/storage/r2";

export type OptionItem = CategoryOption | ToolBadgeOption;

export interface OptionListRepository {
    list(fileName: string): Promise<OptionItem[]>;
    add(fileName: string, label: string): Promise<OptionItem>;
    remove(fileName: string, key: string): Promise<void>;
}

function createOptionListRepository(
    readAll: (fileName: string) => Promise<OptionItem[]>,
    writeAll: (fileName: string, options: OptionItem[]) => Promise<void>
): OptionListRepository {
    return {
        list: readAll,
        async add(fileName, label) {
            const trimmed = label.trim();
            const key = slugify(trimmed);

            if (!key) {
                throw new Error("Name must contain at least one letter or number.");
            }

            const options = await readAll(fileName);
            if (options.some((option) => option.key === key)) {
                throw new Error(`"${trimmed}" already exists.`);
            }

            const option: OptionItem = { key, label: trimmed };
            await writeAll(fileName, [...options, option]);
            return option;
        },
        async remove(fileName, key) {
            const options = await readAll(fileName);
            await writeAll(
                fileName,
                options.filter((option) => option.key !== key)
            );
        },
    };
}

function resolveFsPath(fileName: string): string {
    return path.join(process.cwd(), "..", "..", "packages", "content-data", "src", fileName);
}

function resolveR2Key(fileName: string): string {
    return `content/${fileName}`;
}

const fileSystemOptionListRepository = createOptionListRepository(
    (fileName) => readJsonFile<OptionItem[]>(resolveFsPath(fileName)),
    (fileName, options) => writeJsonFile(resolveFsPath(fileName), options)
);

const r2OptionListRepository = createOptionListRepository(
    (fileName) => readJsonObject<OptionItem[]>(resolveR2Key(fileName)),
    (fileName, options) => writeJsonObject(resolveR2Key(fileName), options)
);

function getOptionListRepository(): OptionListRepository {
    return getStorageDriver() === "r2" ? r2OptionListRepository : fileSystemOptionListRepository;
}

export async function listOptions(fileName: string): Promise<OptionItem[]> {
    return getOptionListRepository().list(fileName);
}

export async function addOption(fileName: string, label: string): Promise<OptionItem> {
    return getOptionListRepository().add(fileName, label);
}

export async function removeOption(fileName: string, key: string): Promise<void> {
    return getOptionListRepository().remove(fileName, key);
}
