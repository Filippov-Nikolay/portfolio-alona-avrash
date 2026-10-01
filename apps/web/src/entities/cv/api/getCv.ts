import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import {
    CvContentSchema,
    resolveCv,
    type CvContent,
    type ResolvedCv,
} from "@avrash/content-schema";
import { fetchContent } from "@/shared/api/contentClient";

export function cvContentDirectory(): string {
    return (
        process.env.CONTENT_DATA_DIR ??
        path.join(process.cwd(), "..", "..", "packages", "content-data", "src")
    );
}

const getCvContent = cache(async (): Promise<CvContent> => {
    try {
        if (process.env.CONTENT_SOURCE === "remote") {
            return await fetchContent("cv", "cv", CvContentSchema);
        }
        // Read the shared file at request time: a bundled JSON import would
        // require a new production build each time the admin replaced the CV.
        const raw = await readFile(path.join(cvContentDirectory(), "cv.json"), "utf-8");
        return CvContentSchema.parse(JSON.parse(raw));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("[cv] Could not read CV metadata", error);
        }
        return { files: {} };
    }
});

export async function getCv(locale: string): Promise<ResolvedCv | null> {
    return resolveCv(await getCvContent(), locale);
}
