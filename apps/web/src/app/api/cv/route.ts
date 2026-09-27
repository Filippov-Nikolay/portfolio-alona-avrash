import { readFile } from "node:fs/promises";
import path from "node:path";
import { cvFileKey } from "@avrash/content-schema";
import { cvContentDirectory, getCv } from "@/entities/cv/api/getCv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const document = await getCv();
    if (!document)
        return new Response("No CV is currently available.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
        });
    try {
        let bytes: Uint8Array;
        if (process.env.CONTENT_SOURCE === "remote") {
            const base = process.env.CONTENT_CDN_URL;
            if (!base) throw new Error("CONTENT_CDN_URL is not configured.");
            const response = await fetch(`${base.replace(/\/$/, "")}/${cvFileKey(document)}`, {
                cache: "no-store",
                signal: AbortSignal.timeout(10_000),
                redirect: "error",
            });
            if (!response.ok) throw new Error(`PDF request failed (${response.status}).`);
            bytes = new Uint8Array(await response.arrayBuffer());
        } else {
            bytes = await readFile(path.join(cvContentDirectory(), cvFileKey(document)));
        }
        return new Response(new Uint8Array(bytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="alona-avrash-cv.pdf"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
                "Content-Length": String(bytes.length),
                // The URL always means the latest saved CV, including after deletion.
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("[cv] Download failed", error);
        return new Response("The CV is temporarily unavailable. Please try again.", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
        });
    }
}
