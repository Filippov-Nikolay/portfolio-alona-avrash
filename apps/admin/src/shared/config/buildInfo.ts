import { getStorageDriver } from "@/shared/storage/driver";
import adminPackageJson from "#package-json";
import webPackageJson from "#web-package-json";

export interface BuildInfo {
    adminVersion: string;
    webVersion: string;
    commit: string;
    environment: string;
    storageLabel: string;
    contentLabel: string;
    lastDeploy: string;
}

function formatEnvironment(): string {
    // VERCEL_ENV is "production" | "preview" | "development" when deployed
    // on Vercel, unset in local dev - default to "Development" rather than
    // showing a blank field.
    const raw = process.env.VERCEL_ENV;
    if (!raw) return "Development";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatLastDeploy(): string {
    const iso = process.env.NEXT_PUBLIC_BUILD_TIME;
    if (!iso) return "Unknown";
    return new Date(iso).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function getBuildInfo(): BuildInfo {
    const isR2 = getStorageDriver() === "r2";

    return {
        adminVersion: adminPackageJson.version,
        webVersion: webPackageJson.version,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
        environment: formatEnvironment(),
        // "Storage" names the actual backend; "Content" names it the way
        // apps/web's own CONTENT_SOURCE env var does. Both read off the
        // same admin-side setting - admin has no way to know web's real
        // CONTENT_SOURCE across a separate deployment, so this is "what
        // admin itself writes to," not a live cross-app status check.
        storageLabel: isR2 ? "Cloudflare R2" : "Local filesystem",
        contentLabel: isR2 ? "Remote" : "Local",
        lastDeploy: formatLastDeploy(),
    };
}
