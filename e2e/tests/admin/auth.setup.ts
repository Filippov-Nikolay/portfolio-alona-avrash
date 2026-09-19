import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { TEST_LOGIN, TEST_PASSWORD } from "../../fixtures/testCredentials";

const STORAGE_STATE_PATH = path.join(__dirname, "..", "..", ".scratch", "admin-storage-state.json");

setup("authenticate as the test admin", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Login").fill(TEST_LOGIN);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Signed in")).toBeVisible();
    await page.waitForURL("/");

    await page.context().storageState({ path: STORAGE_STATE_PATH });
});
