import {
    finishProjectImageUploadAction,
    startProjectImageUploadAction,
    uploadProjectImageAction,
} from "../api/uploadProjectImage";
import {
    MAX_DIRECT_UPLOAD_BYTES,
    projectImageSizeError,
    type ProjectImageUploadResult,
} from "./imageUploadRules";

export async function uploadProjectImageFile(file: File): Promise<ProjectImageUploadResult> {
    const sizeError = projectImageSizeError(file.size, MAX_DIRECT_UPLOAD_BYTES);
    if (sizeError) return { ok: false, error: sizeError };

    const start = await startProjectImageUploadAction({ size: file.size, type: file.type });
    if (!start.ok) return start;
    if (start.ticket.mode === "action") return uploadProjectImageAction(file);

    const { uploadId, uploadUrl, contentType } = start.ticket;
    const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
    }).catch(() => null);
    if (!response?.ok) return { ok: false, error: "Upload to storage failed. Try again." };

    return finishProjectImageUploadAction(uploadId, file.name);
}
