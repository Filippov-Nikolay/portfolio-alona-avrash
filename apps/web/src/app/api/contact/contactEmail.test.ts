import { describe, expect, it } from "vitest";
import { buildContactEmail } from "./contactEmail";

const baseInput = {
    name: "Mykola Filippov",
    email: "mykola@example.com",
    phone: "+48 123 456 789",
    message: "Hello Alona,\nI have a new project.",
    locale: "en",
    submittedAt: "2026-09-20T12:54:39.597Z",
};

describe("buildContactEmail", () => {
    it("creates a branded HTML and plain-text email", () => {
        const email = buildContactEmail(baseInput);

        expect(email.subject).toBe("New project inquiry from Mykola Filippov");
        expect(email.html).toContain("ALONA<br>AVRASH");
        expect(email.html).toContain("#eafd27");
        expect(email.html).toContain("Hello Alona,<br>I have a new project.");
        expect(email.html).toContain("Phone");
        expect(email.html).toContain("+48 123 456 789");
        expect(email.html).toContain("Use your inbox's Reply action");
        expect(email.html).not.toContain("mailto:");
        expect(email.html).not.toContain("tel:");
        expect(email.text).toContain("Phone: +48 123 456 789");
        expect(email.text).toContain("20 Sept 2026, 12:54 UTC");
    });

    it("escapes submitted content and omits an empty phone row", () => {
        const email = buildContactEmail({
            ...baseInput,
            name: '<script>alert("name")</script>',
            phone: "",
            message: "<b>Not markup</b>",
        });

        expect(email.html).not.toContain("<script>");
        expect(email.html).toContain("&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;");
        expect(email.html).toContain("&lt;b&gt;Not markup&lt;/b&gt;");
        expect(email.html).not.toContain("tel:");
    });

    it("keeps control characters out of the email subject", () => {
        const email = buildContactEmail({
            ...baseInput,
            name: "Mykola\r\nBcc: unexpected@example.com",
        });

        expect(email.subject).toBe("New project inquiry from Mykola Bcc: unexpected@example.com");
    });
});
