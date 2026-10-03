import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createRateLimiter, getClientIp } from "@avrash/rate-limit";
import { buildContactEmail } from "./contactEmail";

interface ContactRequestBody {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    message?: unknown;
    locale?: unknown;
    submittedAt?: unknown;
    // Honeypot - a field real visitors never see or fill in (hidden
    // off-screen in ContactSection.tsx). Bots that blindly fill every input
    // they can find end up putting something here.
    company?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contactLimiter = createRateLimiter({
    name: "contact",
    max: 5,
    windowMs: 10 * 60 * 1000,
});

function asTrimmedString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
    if (await contactLimiter.isLimited(getClientIp(request.headers))) {
        return NextResponse.json(
            { error: "Too many requests - try again later." },
            { status: 429 }
        );
    }

    let body: ContactRequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // A filled-in honeypot means a bot submitted this, not a person - report
    // success without actually sending anything, so it doesn't learn to
    // leave the field alone next time. `honeypot: true` is only read by our
    // own client (to skip the contact_success analytics event) - it doesn't
    // change the bot-facing response in any way that would tip it off.
    if (asTrimmedString(body.company)) {
        return NextResponse.json({ accepted: true, honeypot: true });
    }

    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email);
    const phone = asTrimmedString(body.phone);
    const message = asTrimmedString(body.message);
    const locale = asTrimmedString(body.locale) || "unknown";
    const submittedAt = asTrimmedString(body.submittedAt) || new Date().toISOString();

    if (!name || !email || !message || !EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: "Missing or invalid required fields." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_EMAIL_TO;
    const from = process.env.CONTACT_EMAIL_FROM || "onboarding@resend.dev";

    if (!apiKey || !to) {
        console.error(
            "Contact form: RESEND_API_KEY and/or CONTACT_EMAIL_TO are not set - see .env.example."
        );
        return NextResponse.json({ error: "Email sending is not configured." }, { status: 500 });
    }

    const contactEmail = buildContactEmail({
        name,
        email,
        phone,
        message,
        locale,
        submittedAt,
    });

    const resend = new Resend(apiKey);

    try {
        const { error } = await resend.emails.send({
            from: `Alona Avrash Portfolio <${from}>`,
            to,
            replyTo: email,
            subject: contactEmail.subject,
            html: contactEmail.html,
            text: contactEmail.text,
        });

        if (error) {
            console.error("Resend rejected the email:", error);
            return NextResponse.json({ error: "Failed to send the email." }, { status: 502 });
        }
    } catch (err) {
        console.error("Sending the contact email failed:", err);
        return NextResponse.json({ error: "Failed to send the email." }, { status: 502 });
    }

    return NextResponse.json({ accepted: true });
}
