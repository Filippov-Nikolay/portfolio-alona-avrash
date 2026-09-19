"use server";

import path from "node:path";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { getImageStorage } from "@/shared/storage/imageStorage";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);
const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeBaseName(name: string): string {
    const cleaned = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "image";
}

export async function uploadProjectImageAction(file: File): Promise<{ src: string }> {
    await requireAdminSession();

    if (!file.type.startsWith("image/")) {
        throw new Error("Only image files can be uploaded.");
    }
    if (file.size > MAX_BYTES) {
        throw new Error("Image is too large (max 10MB).");
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported file type "${ext || "unknown"}".`);
    }

    const base = sanitizeBaseName(path.basename(file.name, ext));
    const fileName = `${Date.now()}-${base}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    return getImageStorage().upload(fileName, buffer, file.type);
}
