export async function notifyContentChanged(tag: string): Promise<void> {
    const url = process.env.WEB_REVALIDATE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!url || !secret) return;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({ tag }),
        });
        if (!response.ok) {
            console.error(
                `[notifyContentChanged] web responded ${response.status} for tag "${tag}"`
            );
        }
    } catch (error) {
        console.error(`[notifyContentChanged] failed to reach web for tag "${tag}"`, error);
    }
}
