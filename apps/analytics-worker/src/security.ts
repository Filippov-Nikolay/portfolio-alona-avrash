// The Access-Control-Allow-Origin response header only ever tells a
// *browser* what to allow - it does nothing to stop a non-browser client
// (curl, a script) from POSTing directly with any Origin it likes, or none
// at all. These are the actual server-side checks index.ts enforces before
// touching D1.

export function isAllowedOrigin(request: Request, allowedOrigin: string): boolean {
    return request.headers.get("Origin") === allowedOrigin;
}

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function constantTimeEquals(provided: string, expected: string): Promise<boolean> {
    const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
    return difference === 0;
}

export async function isAuthorizedRead(request: Request, secret: string): Promise<boolean> {
    if (!secret) return false;
    return constantTimeEquals(request.headers.get("Authorization") ?? "", `Bearer ${secret}`);
}
