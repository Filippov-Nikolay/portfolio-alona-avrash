import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import bcrypt from "bcryptjs";
import { TEST_LOGIN, TEST_PASSWORD, TEST_SESSION_SECRET } from "./fixtures/testCredentials";

const REPO_ROOT = path.join(__dirname, "..");
const SCRATCH_CONTENT_DIR = path.join(__dirname, ".scratch", "content");
const STORAGE_STATE_PATH = path.join(__dirname, ".scratch", "admin-storage-state.json");

// Wiped and reseeded on every `playwright test` invocation, before the
// admin dev server below even starts - so admin's filesystem storage driver
// (ADMIN_CONTENT_DIR, see apps/admin/src/shared/storage/contentDir.ts) never
// reads stale data from a previous run, and never touches the real
// packages/content-data this scratch dir stands in for.
function seedContentDir(): void {
    rmSync(SCRATCH_CONTENT_DIR, { recursive: true, force: true });
    mkdirSync(SCRATCH_CONTENT_DIR, { recursive: true });
    mkdirSync(path.join(SCRATCH_CONTENT_DIR, "uploads"), { recursive: true });

    const write = (fileName: string, data: unknown) =>
        writeFileSync(
            path.join(SCRATCH_CONTENT_DIR, fileName),
            `${JSON.stringify(data, null, 4)}\n`
        );

    write("projects.json", []);
    write("categories.json", [
        { key: "branding", label: "Branding" },
        { key: "packaging", label: "Packaging" },
    ]);
    write("tool-badges.json", []);
}

seedContentDir();

const ADMIN_USERS_BASE64 = Buffer.from(
    JSON.stringify([{ login: TEST_LOGIN, passwordHash: bcrypt.hashSync(TEST_PASSWORD, 10) }])
).toString("base64");

export default defineConfig({
    testDir: "./tests",
    // The admin project shares one JSON-file-backed dataset across every
    // test (no per-test isolation, no locking) - run everything on a single
    // worker so no two tests can read-modify-write projects.json at once.
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // "list" alone is fine locally (a live terminal), but leaves nothing to
    // inspect after a CI run - "html" writes a report e2e-ci.yml uploads as
    // an artifact, and "github" turns a failure into an inline PR
    // annotation instead of just a line buried in the job log.
    reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
    use: {
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "admin-setup",
            testDir: "./tests/admin",
            testMatch: /auth\.setup\.ts/,
            use: { baseURL: "http://localhost:3101" },
        },
        {
            name: "admin",
            testDir: "./tests/admin",
            testIgnore: /auth\.setup\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                baseURL: "http://localhost:3101",
                storageState: STORAGE_STATE_PATH,
            },
            dependencies: ["admin-setup"],
        },
        {
            name: "web",
            testDir: "./tests/web",
            use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100" },
        },
        {
            name: "web-ios",
            testDir: "./tests/web",
            testMatch:
                /(gsap-animation-performance|clients-tools-reviews-ios|contact-footer-mobile|footer-ios-overscroll|header-menu-ios|hero-selected-work-state|hero-theme-transition|hero-scroll-performance|hero-navigation-performance|hero-raster-budget|hero-stats-selected-spacing|stats-reel-clipping|projects-ios-button|reviews-ios-reveal|services-ios-resize|services-mobile|tools-ios-scroll|tools-ios-visibility|works-filter-ios-tap|works-scroll-performance)\.spec\.ts/,
            use: { ...devices["iPhone 13"], baseURL: "http://localhost:3100" },
        },
        {
            name: "web-webkit",
            testDir: "./tests/web",
            testMatch:
                /(gsap-animation-performance|hero-selected-work-state|hero-theme-transition|hero-scroll-performance|hero-navigation-performance|hero-raster-budget|hero-stats-selected-spacing|stats-reel-clipping|showcase-mobile|works-scroll-performance|works-filter-ios-tap)\.spec\.ts/,
            use: {
                ...devices["iPhone 13"],
                browserName: "webkit",
                baseURL: "http://localhost:3100",
            },
        },
    ],
    // Dedicated ports, deliberately different from the app's normal 3000/
    // 3001 dev ports - so this suite never attaches to (or fights over a
    // port with) a developer's own already-running `pnpm dev`, and always
    // spawns its own fresh, isolated server instead.
    webServer: [
        {
            command: "pnpm exec next dev -p 3100",
            cwd: path.join(REPO_ROOT, "apps", "web"),
            url: "http://localhost:3100",
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                // Not a real service - specs that care intercept this exact
                // URL with page.route() before it ever leaves the browser.
                // Set unconditionally so the CSP connect-src it also drives
                // (see next.config.ts) matches what analytics specs expect.
                NEXT_PUBLIC_ANALYTICS_ENDPOINT: "https://analytics.e2e.test/event",
            },
        },
        {
            command: "pnpm exec next dev -p 3101",
            cwd: path.join(REPO_ROOT, "apps", "admin"),
            url: "http://localhost:3101/login",
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                ADMIN_CONTENT_DIR: SCRATCH_CONTENT_DIR,
                ADMIN_USERS: ADMIN_USERS_BASE64,
                SESSION_SECRET: TEST_SESSION_SECRET,
            },
        },
    ],
});
