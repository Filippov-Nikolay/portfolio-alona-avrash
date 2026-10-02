import { readFile } from "node:fs/promises";
import path from "node:path";
import { cvFileKey, hasPdfSignature, MAX_CV_BYTES, type CvDocument } from "@avrash/content-schema";
import { cvContentDirectory } from "./getCv";

const files = new Map<string, Promise<Uint8Array>>();
const MAX_CACHED_FILES = 3;

async function readPdf(location: string, remote: boolean, size: number): Promise<Uint8Array> {
    let bytes: Uint8Array;
    if (remote) {
        const response = await fetch(location, {
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
            redirect: "error",
        });
        if (!response.ok) throw new Error(`PDF request failed (${response.status}).`);
        bytes = new Uint8Array(await response.arrayBuffer());
    } else {
        bytes = await readFile(location);
    }
    if (bytes.length !== size || bytes.length > MAX_CV_BYTES || !hasPdfSignature(bytes)) {
        throw new Error("The stored CV is not a complete PDF.");
    }
    return bytes;
}

export function getCvFile(document: CvDocument): Promise<Uint8Array> {
    const remote = process.env.CONTENT_SOURCE === "remote";
    const base = process.env.CONTENT_CDN_URL;
    if (remote && !base) return Promise.reject(new Error("CONTENT_CDN_URL is not configured."));
    const location = remote
        ? `${base!.replace(/\/$/, "")}/${cvFileKey(document)}`
        : path.join(cvContentDirectory(), cvFileKey(document));
    const key = `${location}:${document.size}`;
    const cached = files.get(key);
    if (cached) {
        files.delete(key);
        files.set(key, cached);
        return cached;
    }
    const pending = readPdf(location, remote, document.size).catch((error) => {
        if (files.get(key) === pending) files.delete(key);
        throw error;
    });
    files.set(key, pending);
    while (files.size > MAX_CACHED_FILES) files.delete(files.keys().next().value!);
    return pending;
}
