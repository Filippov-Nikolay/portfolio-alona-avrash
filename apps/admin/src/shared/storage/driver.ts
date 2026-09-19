// Selects which storage backend the repositories below talk to. Local dev
// (and this repo's current single-filesystem deployment) uses "filesystem" -
// admin and web share a disk, so admin can write straight into
// packages/content-data and apps/web/public. A production deployment where
// admin and web are separate Vercel projects has no shared, persistent
// filesystem, so it must use "r2" instead (see ./r2.ts).
export type StorageDriver = "filesystem" | "r2";

export function getStorageDriver(): StorageDriver {
    return process.env.ADMIN_STORAGE_DRIVER === "r2" ? "r2" : "filesystem";
}
