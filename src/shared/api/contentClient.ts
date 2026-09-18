import { getContentResource } from "./contentStore";

export async function fetchContent<T>(path: string, tag: string): Promise<T> {
    const local = getContentResource(path);
    if (local !== undefined) return local as T;

    const response = await fetch(`${process.env.CONTENT_API_URL}/${path}`, {
        next: { tags: [tag] },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}`);
    }

    return response.json();
}
