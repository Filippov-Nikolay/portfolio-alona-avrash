"use server";

import { randomUUID } from "node:crypto";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { getStorageDriver } from "@/shared/storage/driver";
import { deleteObject, objectSize, presignUpload, readObject } from "@/shared/storage/r2";
import {
    MAX_DIRECT_UPLOAD_BYTES,
    PROJECT_IMAGE_CONTENT_TYPES,
    projectImageSizeError,
    UNSUPPORTED_PROJECT_IMAGE,
    type ProjectImageUploadResult,
} from "../lib/imageUploadRules";
import { storeProjectImage, toUploadResult, UploadRejectedError } from "./storeProjectImage";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const INCOMING_PREFIX = "projects/uploads/incoming";
const UPLOAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTENT_TYPES: ReadonlySet<string> = new Set(PROJECT_IMAGE_CONTENT_TYPES);

export type ProjectImageUploadTicket =
    | { mode: "action" }
    | { mode: "direct"; uploadId: string; uploadUrl: string; contentType: string };

export type StartProjectImageUploadResult =
    { ok: true; ticket: ProjectImageUploadTicket } | { ok: false; error: string };

export async function startProjectImageUploadAction(file: {
    size: number;
    type: string;
}): Promise<StartProjectImageUploadResult> {
    await requireAdminSession();

    if (getStorageDriver() !== "r2") {
        const sizeError = projectImageSizeError(file.size);
        return sizeError
            ? { ok: false, error: sizeError }
            : { ok: true, ticket: { mode: "action" } };
    }

    const sizeError = projectImageSizeError(file.size, MAX_DIRECT_UPLOAD_BYTES);
    if (sizeError) return { ok: false, error: sizeError };
    if (!CONTENT_TYPES.has(file.type)) return { ok: false, error: UNSUPPORTED_PROJECT_IMAGE };

    const uploadId = randomUUID();
    const uploadUrl = await presignUpload(
        `${INCOMING_PREFIX}/${uploadId}`,
        file.type,
        UPLOAD_URL_TTL_SECONDS
    );
    return { ok: true, ticket: { mode: "direct", uploadId, uploadUrl, contentType: file.type } };
}

export async function finishProjectImageUploadAction(
    uploadId: string,
    fileName: string
): Promise<ProjectImageUploadResult> {
    await requireAdminSession();
    if (getStorageDriver() !== "r2" || !UPLOAD_ID.test(uploadId)) {
        return { ok: false, error: "Unknown upload. Try again." };
    }

    const key = `${INCOMING_PREFIX}/${uploadId}`;
    try {
        return await toUploadResult(async () => {
            const sizeError = projectImageSizeError(await objectSize(key), MAX_DIRECT_UPLOAD_BYTES);
            if (sizeError) throw new UploadRejectedError(sizeError);
            return storeProjectImage(Buffer.from(await readObject(key)), fileName);
        });
    } finally {
        await deleteObject(key).catch(() => {});
    }
}

export async function uploadProjectImageAction(file: File): Promise<ProjectImageUploadResult> {
    await requireAdminSession();

    const sizeError = projectImageSizeError(file.size);
    if (sizeError) return { ok: false, error: sizeError };

    return toUploadResult(async () =>
        storeProjectImage(Buffer.from(await file.arrayBuffer()), file.name)
    );
}
