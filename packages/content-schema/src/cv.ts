import { z } from "zod";

// Fits within the request limit of the serverless deployment, including multipart overhead.
export const MAX_CV_BYTES = 4 * 1024 * 1024;
export const CV_STORAGE_PREFIX = "cv/uploads";

export const CvDocumentSchema = z.object({
    id: z.uuid(),
    fileName: z.string().min(1).max(180),
    size: z.number().int().positive().max(MAX_CV_BYTES),
    updatedAt: z.iso.datetime(),
});

export const CvContentSchema = CvDocumentSchema.nullable();
export type CvDocument = z.infer<typeof CvDocumentSchema>;

export function cvFileKey(document: CvDocument): string {
    return `${CV_STORAGE_PREFIX}/${document.id}.pdf`;
}

export function cvFileError(file: { name: string; size: number; type: string }): string | null {
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) {
        return "Choose a PDF document.";
    }
    if (file.size === 0) return "This file is empty. Choose another PDF.";
    if (file.size > MAX_CV_BYTES) return "The PDF must be 4 MB or smaller.";
    return null;
}

// Check bytes as well as the browser-provided MIME type. This is a format
// sanity check; rendering and page navigation stay with the browser's PDF viewer.
export function hasPdfSignature(bytes: Uint8Array): boolean {
    return (
        /^%PDF-\d\.\d/.test(String.fromCharCode(...bytes.subarray(0, 8))) &&
        /%%EOF\s*$/.test(String.fromCharCode(...bytes.subarray(Math.max(0, bytes.length - 1024))))
    );
}
