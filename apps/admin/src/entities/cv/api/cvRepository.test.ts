import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cvFileKey, type CvDocument } from "@avrash/content-schema";
import { createCvRepository, getCvRepository } from "./cvRepository";

const previous: CvDocument = {
    id: "5e7207f7-b763-4071-8e1b-6c513aecfb8a",
    fileName: "previous.pdf",
    size: 20,
    updatedAt: "2026-09-27T12:00:00.000Z",
};

function setup() {
    let current: CvDocument | null = previous;
    const storage = {
        read: vi.fn(async () => current),
        write: vi.fn(async (value: CvDocument | null) => {
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
        await expect(repository.save("new.pdf", Buffer.from("pdf"))).rejects.toThrow(
            "upload failed"
        );
        expect(current()).toEqual(previous);
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.write).not.toHaveBeenCalled();
    });

    it("rolls back only the new file when saving metadata fails", async () => {
        const { storage, repository, current } = setup();
        storage.write.mockRejectedValueOnce(new Error("write failed"));
        await expect(repository.save("new.pdf", Buffer.from("pdf"))).rejects.toThrow(
            "write failed"
        );
        expect(current()).toEqual(previous);
        expect(storage.remove).toHaveBeenCalledOnce();
        expect(storage.remove.mock.calls[0]).not.toEqual([cvFileKey(previous)]);
    });

    it("publishes the replacement before deleting the old file", async () => {
        const { storage, repository, current } = setup();
        const next = await repository.save("new.pdf", Buffer.from("pdf"));
        expect(next.id).not.toBe(previous.id);
        expect(current()).toEqual(next);
        expect(storage.remove).toHaveBeenCalledWith(cvFileKey(previous));
        expect(storage.upload.mock.invocationCallOrder[0]).toBeLessThan(
            storage.write.mock.invocationCallOrder[0]
        );
        expect(storage.write.mock.invocationCallOrder[0]).toBeLessThan(
            storage.remove.mock.invocationCallOrder[0]
        );
    });

    it("does not report a successful save as failed if old-file cleanup fails", async () => {
        const { storage, repository, current } = setup();
        vi.spyOn(console, "error").mockImplementation(() => {});
        storage.remove.mockRejectedValueOnce(new Error("cleanup failed"));
        const next = await repository.save("new.pdf", Buffer.from("pdf"));
        expect(current()).toEqual(next);
    });

    it("never deletes the published file when unpublishing fails", async () => {
        const { storage, repository, current } = setup();
        storage.write.mockRejectedValueOnce(new Error("write failed"));
        await expect(repository.remove()).rejects.toThrow("write failed");
        expect(current()).toEqual(previous);
        expect(storage.remove).not.toHaveBeenCalled();
    });

    it("treats a missing record as empty, but rejects malformed metadata", async () => {
        const { storage, repository } = setup();
        storage.read.mockRejectedValueOnce(Object.assign(new Error(), { code: "ENOENT" }));
        await expect(repository.get()).resolves.toBeNull();
        storage.read.mockResolvedValueOnce({ ...previous, id: "../../secret" });
        await expect(repository.get()).rejects.toThrow();
    });

    it("saves, replaces and removes real files in an isolated directory", async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "avrash-cv-"));
        vi.stubEnv("ADMIN_CONTENT_DIR", dir);
        vi.stubEnv("ADMIN_STORAGE_DRIVER", "filesystem");
        try {
            const repository = getCvRepository();
            expect(await repository.get()).toBeNull();
            const first = await repository.save("first.pdf", Buffer.from("first"));
            expect(Buffer.from(await repository.download(first)).toString()).toBe("first");
            const second = await repository.save("second.pdf", Buffer.from("second"));
            await expect(readFile(path.join(dir, cvFileKey(first)))).rejects.toMatchObject({
                code: "ENOENT",
            });
            expect(await repository.get()).toEqual(second);
            await repository.remove();
            expect(await repository.get()).toBeNull();
            await expect(readFile(path.join(dir, cvFileKey(second)))).rejects.toMatchObject({
                code: "ENOENT",
            });
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
