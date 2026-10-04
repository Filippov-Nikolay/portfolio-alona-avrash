import { expect, test } from "@playwright/test";

const EXPECTED_HEADERS = {
    "x-frame-options": "DENY",
    "content-security-policy": "frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    "x-robots-tag": "noindex, nofollow",
};

test.describe("admin security headers", () => {
    for (const path of ["/login", "/works/projects"]) {
        test(`${path} cannot be framed or indexed`, async ({ request }) => {
            const response = await request.get(path, { maxRedirects: 0 });
            const headers = response.headers();

            for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
                expect(headers[name], name).toBe(value);
            }
            expect(headers["permissions-policy"]).toContain("camera=()");
        });
    }
});
