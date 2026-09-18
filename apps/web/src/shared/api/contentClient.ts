import { getContentResource } from "./contentStore";

export async function fetchContent<T>(path: string, tag: string): Promise<T> {
    const local = getContentResource(path);
    if (local !== undefined) return local as T;

    const apiUrl = process.env.CONTENT_API_URL;
    if (!apiUrl) {
        throw new Error(
            `No local content for "${path}" and CONTENT_API_URL is not set - ` +
                `add it to .env (see .env.example) to fetch it from an external CMS.`
        );
    }

    const response = await fetch(`${apiUrl}/${path}`, {
        next: { tags: [tag] },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}`);
    }

    return response.json();
}
