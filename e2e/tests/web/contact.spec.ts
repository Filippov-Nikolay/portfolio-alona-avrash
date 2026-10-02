import { expect, test } from "../../fixtures/test";

// The route handler is mocked rather than hit for real - a Playwright run
// should never send an actual email through Resend (no real API key in
// this env either way, and CI shouldn't spam a real inbox). This tests the
// form's own behavior: does it show the right toast for each outcome, not
// whether Resend itself works.
test.describe("contact form", () => {
    test("shows a success toast after a successful submission", async ({ page }) => {
        await page.route("**/api/contact", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ accepted: true }),
            });
        });

        await page.goto("/en/contact");
        await page.getByLabel("Name*").fill("Jane Tester");
        await page.getByLabel("Email*").fill("jane@example.com");
        await page.getByLabel("Message*").fill("Hello, this is an E2E test message.");
        await page.getByRole("button", { name: "Send message" }).click();

        const toast = page
            .getByRole("status")
            .filter({ hasText: "Thank you! Your message has been received." });
        await expect(toast).toBeVisible();
    });

    test("shows an error toast when the request fails", async ({ page }) => {
        await page.route("**/api/contact", async (route) => {
            await route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({ error: "boom" }),
            });
        });

        await page.goto("/en/contact");
        await page.getByLabel("Name*").fill("Jane Tester");
        await page.getByLabel("Email*").fill("jane@example.com");
        await page.getByLabel("Message*").fill("Hello, this is an E2E test message.");
        await page.getByRole("button", { name: "Send message" }).click();

        const toast = page
            .getByRole("status")
            .filter({ hasText: "Something went wrong. Please try again." });
        await expect(toast).toBeVisible();
    });

    test("leaves the honeypot field empty and out of tab order for a real user", async ({
        page,
    }) => {
        await page.goto("/en/contact");
        const honeypot = page.locator('input[name="company"]');
        await expect(honeypot).toHaveValue("");
        await expect(honeypot).toHaveAttribute("tabindex", "-1");
    });
});
