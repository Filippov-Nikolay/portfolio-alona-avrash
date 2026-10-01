import { hasPdfSignature, MAX_CV_BYTES } from "@avrash/content-schema";

type DownloadedCv = { blob: Blob; fileName: string; locale: string | null };
const downloads = new Map<string, { etag: string; file: DownloadedCv }>();

export async function downloadCv(href: string, signal: AbortSignal) {
    const cached = downloads.get(href);
    const response = await fetch(href, {
        signal,
        redirect: "error",
        ...(cached ? { headers: { "If-None-Match": cached.etag } } : {}),
    });
    if (response.status === 304 && cached) {
        downloads.delete(href);
        downloads.set(href, cached);
        return cached.file;
    }
    if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "application/pdf") {
        throw new Error("CV download failed.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_CV_BYTES || !hasPdfSignature(bytes)) {
        throw new Error("The downloaded CV is not a complete PDF.");
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const plainName = /filename="([^"]+)"/i.exec(disposition)?.[1] ?? "cv.pdf";
    let fileName = plainName;
    if (encodedName) {
        try {
            fileName = decodeURIComponent(encodedName);
        } catch {}
    }
    const file = {
        blob: new Blob([bytes], { type: "application/pdf" }),
        fileName: fileName.replace(/[\x00-\x1f\x7f/\\]/g, "_"),
        locale: response.headers.get("content-language"),
    };
    const etag = response.headers.get("etag");
    if (etag) {
        downloads.delete(href);
        downloads.set(href, { etag, file });
        while (downloads.size > 3) downloads.delete(downloads.keys().next().value!);
    }
    return file;
}
