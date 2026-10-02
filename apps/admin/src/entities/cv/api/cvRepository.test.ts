import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cvFileKey, type CvContent, type CvDocument } from "@avrash/content-schema";
import { createCvRepository, getCvRepository } from "./cvRepository";

const previous: CvDocument = {
    id: "5e7207f7-b763-4071-8e1b-6c513aecfb8a",
    fileName: "previous.pdf",
    size: 20,
    updatedAt: "2026-09-27T12:00:00.000Z",
};

const polish: CvDocument = {
    id: "0b6a2a8e-77a3-4f39-9a49-0c4f0d6f7c11",
    fileName: "polish.pdf",
    size: 30,
    updatedAt: "2026-09-28T12:00:00.000Z",
};

function setup(initial: CvContent = { files: { en: previous } }) {
    let current: CvContent = initial;
    const storage = {
        read: vi.fn(async (): Promise<unknown> => current),
        write: vi.fn(async (value: CvContent) => {
            current = value;
        }),
        upload: vi.fn(async () => {}),
        download: vi.fn(async () => new Uint8Array()),
        remove: vi.fn(async () => {}),
    };
    return { storage, repository: createCvRepository(storage), current: () => current };
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("CV publication", () => {
    it("keeps the previous CV when the new upload fails", async () => {
        const { storage, repository, current } = setup();
        storage.upload.mockRejectedValueOnce(new Error("upload failed"));
        await expect(repository.save("en", "new.pdf", Buffer.from("pdf"))).rejects.toThrow(
            "upload failed"
        );
        expect(current()).toEqual({ files: { en: previous } });
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.write).not.toHaveBeenCalled();
    });

    it("rolls back only the new file when saving metadata fails", async () => {
        const { storage, repository, current } = setup();
        storage.write.mockRejectedValueOnce(new Error("write failed"));
        await expect(repository.save("en", "new.pdf", Buffer.from("pdf"))).rejects.toThrow(
            "write failed"
        );
        expect(current()).toEqual({ files: { en: previous } });
        expect(storage.remove).toHaveBeenCalledOnce();
        expect(storage.remove.mock.calls[0]).not.toEqual([cvFileKey(previous)]);
    });

    it("publishes the replacement before deleting the old file", async () => {
        const { storage, repository, current } = setup();
        const next = await repository.save("en", "new.pdf", Buffer.from("pdf"));
        expect(next.files.en!.id).not.toBe(previous.id);
        expect(current()).toEqual(next);
        expect(storage.remove).toHaveBeenCalledWith(cvFileKey(previous));
        expect(storage.upload.mock.invocationCallOrder[0]).toBeLessThan(
            storage.write.mock.invocationCallOrder[0]
        );
        expect(storage.write.mock.invocationCallOrder[0]).toBeLessThan(
            storage.remove.mock.invocationCallOrder[0]
        );
    });

    it("adds and replaces one language without touching the others", async () => {
        const { storage, repository } = setup({ files: { pl: polish } });
        const added = await repository.save("en", "english.pdf", Buffer.from("pdf"));
        expect(Object.keys(added.files)).toEqual(["en", "pl"]);
        expect(added.files.pl).toEqual(polish);
        expect(storage.remove).not.toHaveBeenCalled();

        const replaced = await repository.save("pl", "nowe.pdf", Buffer.from("pdf"));
        expect(replaced.files.en).toEqual(added.files.en);
        expect(replaced.files.pl!.fileName).toBe("nowe.pdf");
        expect(storage.remove).toHaveBeenCalledExactlyOnceWith(cvFileKey(polish));
    });

    it("does not report a successful save as failed if old-file cleanup fails", async () => {
        const { storage, repository, current } = setup();
        vi.spyOn(console, "error").mockImplementation(() => {});
        storage.remove.mockRejectedValueOnce(new Error("cleanup failed"));
        const next = await repository.save("en", "new.pdf", Buffer.from("pdf"));
        expect(current()).toEqual(next);
    });

    it("removes one language and leaves the rest published", async () => {
        const { storage, repository, current } = setup({ files: { en: previous, pl: polish } });
        await expect(repository.remove("pl")).resolves.toEqual({ files: { en: previous } });
        expect(current()).toEqual({ files: { en: previous } });
        expect(storage.remove).toHaveBeenCalledExactlyOnceWith(cvFileKey(polish));
        await repository.remove("pl");
        expect(storage.write).toHaveBeenCalledOnce();
    });

    it("never deletes the published file when unpublishing fails", async () => {
        const { storage, repository, current } = setup();
        storage.write.mockRejectedValueOnce(new Error("write failed"));
        await expect(repository.remove("en")).rejects.toThrow("write failed");
        expect(current()).toEqual({ files: { en: previous } });
        expect(storage.remove).not.toHaveBeenCalled();
    });

    it("treats a missing record as empty, but rejects malformed metadata", async () => {
        const { storage, repository } = setup();
        storage.read.mockRejectedValueOnce(Object.assign(new Error(), { code: "ENOENT" }));
        await expect(repository.get()).resolves.toEqual({ files: {} });
        storage.read.mockResolvedValueOnce({ files: { en: { ...previous, id: "../../secret" } } });
        await expect(repository.get()).rejects.toThrow();
    });

    it("reads the single CV saved before languages as the default-language CV", async () => {
        const { storage, repository } = setup();
        storage.read.mockResolvedValueOnce(previous);
        await expect(repository.get()).resolves.toEqual({ files: { en: previous } });
        storage.read.mockResolvedValueOnce(null);
        await expect(repository.get()).resolves.toEqual({ files: {} });
    });

    it("saves, replaces and removes real files in an isolated directory", async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "avrash-cv-"));
        vi.stubEnv("ADMIN_CONTENT_DIR", dir);
        vi.stubEnv("ADMIN_STORAGE_DRIVER", "filesystem");
        try {
            await writeFile(path.join(dir, "cv.json"), "null\n");
            const repository = getCvRepository();
            expect(await repository.get()).toEqual({ files: {} });
            const first = (await repository.save("en", "first.pdf", Buffer.from("first"))).files
                .en!;
            expect(Buffer.from(await repository.download(first)).toString()).toBe("first");
            const polishCv = (await repository.save("pl", "pl.pdf", Buffer.from("pl"))).files.pl!;
            const second = (await repository.save("en", "second.pdf", Buffer.from("second"))).files
                .en!;
            await expect(readFile(path.join(dir, cvFileKey(first)))).rejects.toMatchObject({
                code: "ENOENT",
            });
            expect(await repository.get()).toEqual({ files: { en: second, pl: polishCv } });
            await repository.remove("en");
            expect(await repository.get()).toEqual({ files: { pl: polishCv } });
            await expect(readFile(path.join(dir, cvFileKey(second)))).rejects.toMatchObject({
                code: "ENOENT",
            });
            expect(Buffer.from(await repository.download(polishCv)).toString()).toBe("pl");
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
