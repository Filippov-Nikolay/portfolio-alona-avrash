// Fixed, non-secret credentials for the E2E admin user - never used against
// a real deployment, only against the throwaway admin dev server Playwright
// spawns for this suite (see playwright.config.ts's webServer env).
export const TEST_LOGIN = "e2e";
export const TEST_PASSWORD = "e2e-test-password";
export const TEST_SESSION_SECRET = "e2e-test-session-secret-not-for-real-use";
