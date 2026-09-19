// The Access-Control-Allow-Origin response header only ever tells a
// *browser* what to allow - it does nothing to stop a non-browser client
// (curl, a script) from POSTing directly with any Origin it likes, or none
// at all. These are the actual server-side checks index.ts enforces before
// touching D1.

export function isAllowedOrigin(request: Request, allowedOrigin: string): boolean {
    return request.headers.get("Origin") === allowedOrigin;
}

export function isAuthorizedRead(request: Request, secret: string): boolean {
    return request.headers.get("Authorization") === `Bearer ${secret}`;
}
