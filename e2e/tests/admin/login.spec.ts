import { expect, test } from "@playwright/test";
import { TEST_LOGIN, TEST_PASSWORD } from "../../fixtures/testCredentials";

// Runs unauthenticated - overrides the "admin" project's pre-signed-in
// storageState, since this spec is exactly what proves signing in works.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login", () => {
    test("redirects an unauthenticated visitor to /login", async ({ page }) => {
        await page.goto("/works/projects");
        await expect(page).toHaveURL(/\/login$/);
    });

    test("shows an error for an incorrect password and stays on /login", async ({ page }) => {
        await page.goto("/login", { waitUntil: "networkidle" });
        await page.getByLabel("Login").fill(TEST_LOGIN);
        await page.getByLabel("Password").fill("definitely-wrong-password");
        await page.getByRole("button", { name: "Sign in" }).click();

        await expect(page.getByText("Incorrect login or password.")).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test("signs in with valid credentials and reaches the dashboard", async ({ page }) => {
        await page.goto("/login", { waitUntil: "networkidle" });
        await page.getByLabel("Login").fill(TEST_LOGIN);
        await page.getByLabel("Password").fill(TEST_PASSWORD);
        await page.getByRole("button", { name: "Sign in" }).click();

        await page.getByText("Signed in").waitFor();
        await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
        await expect(page).not.toHaveURL(/\/login$/);
    });
});
