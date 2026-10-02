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
        expect(email.html).toContain("Reply to Mykola Filippov");
        expect(email.html).toContain(
            "mailto:mykola@example.com?subject=Re%3A%20your%20project%20inquiry%20to%20Alona%20Avrash"
        );
        expect(email.html.match(/mailto:/g)).toHaveLength(1);
        expect(email.html).not.toContain("tel:");
        expect(email.html).toContain("color:#050505!important");
        expect(email.html).toContain("a[x-apple-data-detectors]");
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
