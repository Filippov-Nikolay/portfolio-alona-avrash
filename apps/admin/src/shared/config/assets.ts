// Project image paths ("/projects/foo.png") are stored relative to
// apps/web's public/ folder - there is no image host yet, so previews in
// the admin UI resolve them against the running web app. Once the CMS
// writes to R2, this becomes the R2/CDN base URL instead - the stored
// paths won't need to change, just this one constant.
export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "http://localhost:3000";

export function assetUrl(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    return `${ASSET_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
