import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getClientIp, isRateLimited } from "@/shared/lib/rateLimit";

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
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function asTrimmedString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
    const ip = getClientIp(request.headers);
    if (isRateLimited(`contact:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
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
    // leave the field alone next time.
    if (asTrimmedString(body.company)) {
        return NextResponse.json({ accepted: true });
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

    const html = `
        <h2>New message from the portfolio contact form</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
        <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        <hr>
        <p style="color:#888;font-size:12px;">Locale: ${escapeHtml(locale)} - Submitted: ${escapeHtml(submittedAt)}</p>
    `;

    const resend = new Resend(apiKey);

    try {
        const { error } = await resend.emails.send({
            from: `Portfolio contact form <${from}>`,
            to,
            replyTo: email,
            subject: `New message from ${name}`,
            html,
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
