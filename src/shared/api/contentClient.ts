export async function fetchContent<T>(path: string, tag: string): Promise<T> {
    const response = await fetch(`${process.env.CONTENT_API_URL}/${path}`, {
        next: { tags: [tag] },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}`);
    }

    return response.json();
}
