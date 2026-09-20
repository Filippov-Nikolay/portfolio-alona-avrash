interface ContactEmailInput {
    name: string;
    email: string;
    phone?: string;
    message: string;
    locale: string;
    submittedAt: string;
}

const ACCENT = "#eafd27";

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatSubmittedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return `${new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC",
    }).format(date)} UTC`;
}

function detailRow(label: string, value: string, href?: string): string {
    const content = href
        ? `<a href="${escapeHtml(href)}" style="color:#050505;text-decoration:underline;text-decoration-color:#aebd00;text-underline-offset:3px;">${escapeHtml(value)}</a>`
        : escapeHtml(value);

    return `
        <tr>
            <td class="detail-label" style="width:112px;padding:14px 20px 14px 0;border-bottom:1px solid #dddddd;color:#6b6b6b;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;text-transform:uppercase;letter-spacing:1.2px;vertical-align:top;">
                ${label}
            </td>
            <td style="padding:14px 0;border-bottom:1px solid #dddddd;color:#050505;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;line-height:1.45;overflow-wrap:anywhere;vertical-align:top;">
                ${content}
            </td>
        </tr>
    `;
}

export function buildContactEmail(input: ContactEmailInput) {
    const name = escapeHtml(input.name);
    const subjectName = input.name.replace(/[\x00-\x1f\x7f]+/g, " ").trim();
    const email = escapeHtml(input.email);
    const message = escapeHtml(input.message).replace(/\r?\n/g, "<br>");
    const locale = escapeHtml(input.locale.toUpperCase());
    const submittedAt = escapeHtml(formatSubmittedAt(input.submittedAt));
    const replySubject = encodeURIComponent(`Re: your project inquiry to Alona Avrash`);
    const replyHref = `mailto:${input.email}?subject=${replySubject}`;
    const phoneHref = input.phone ? `tel:${input.phone.replace(/[^\d+]/g, "")}` : undefined;
    const phoneRow = input.phone ? detailRow("Phone", input.phone, phoneHref) : "";

    const html = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light only">
        <title>New project inquiry from ${name}</title>
        <style>
            @media only screen and (max-width: 620px) {
                .email-shell { width: 100% !important; }
                .email-padding { padding-right: 24px !important; padding-left: 24px !important; }
                .brand-role { display: none !important; }
                .hero-title { font-size: 34px !important; line-height: 0.98 !important; }
                .detail-label { width: 82px !important; }
                .reply-button { display: block !important; text-align: center !important; }
            }
        </style>
    </head>
    <body style="margin:0;padding:0;background:#ededed;color:#050505;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${name} sent a new project inquiry through avrash.com.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ededed;border-collapse:collapse;">
            <tr>
                <td align="center" style="padding:32px 12px;">
                    <table role="presentation" class="email-shell" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;background:#ffffff;border-collapse:separate;border-spacing:0;border:1px solid #d8d8d8;">
                        <tr>
                            <td class="email-padding" style="padding:22px 36px;background:#050505;border-bottom:4px solid ${ACCENT};">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                                    <tr>
                                        <td style="color:${ACCENT};font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;line-height:1;text-transform:uppercase;">
                                            ALONA<br>AVRASH
                                        </td>
                                        <td class="brand-role" align="right" style="color:#a9a9a9;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;line-height:1.4;text-transform:uppercase;letter-spacing:1.3px;">
                                            Brand &amp; Visual Designer<br>Portfolio contact
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="email-padding" style="padding:44px 36px 28px;">
                                <p style="margin:0 0 14px;color:#606060;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1;text-transform:uppercase;letter-spacing:1.5px;">
                                    New inquiry <span style="color:#a5b500;">/</span> ${locale}
                                </p>
                                <h1 class="hero-title" style="margin:0;max-width:500px;color:#050505;font-family:Arial,Helvetica,sans-serif;font-size:44px;font-weight:800;line-height:0.98;letter-spacing:0;text-transform:uppercase;">
                                    Let's create<br>something great.
                                </h1>
                                <p style="margin:22px 0 0;color:#555555;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;">
                                    <strong style="color:#050505;">${name}</strong> sent a message through the portfolio contact form.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td class="email-padding" style="padding:0 36px 32px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #050505;border-collapse:collapse;">
                                    ${detailRow("Name", input.name)}
                                    ${detailRow("Email", input.email, `mailto:${input.email}`)}
                                    ${phoneRow}
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="email-padding" style="padding:0 36px 36px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#050505;border-collapse:separate;border-spacing:0;">
                                    <tr>
                                        <td style="padding:25px 26px 10px;color:${ACCENT};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1;text-transform:uppercase;letter-spacing:1.4px;">
                                            Message
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:0 26px 28px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.55;overflow-wrap:anywhere;">
                                            ${message}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="email-padding" style="padding:0 36px 44px;">
                                <a href="${escapeHtml(replyHref)}" class="reply-button" style="display:inline-block;padding:15px 24px;background:${ACCENT};color:#050505;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;line-height:1;text-decoration:none;text-transform:uppercase;">
                                    Reply to ${name} &nbsp;&#8599;
                                </a>
                                <p style="margin:18px 0 0;color:#737373;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;">
                                    Replying to this email also sends your response directly to<br style="display:none;"> <a href="mailto:${email}" style="color:#050505;text-decoration:underline;">${email}</a>.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td class="email-padding" style="padding:18px 36px;background:#f4f4f4;border-top:1px solid #dddddd;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                                    <tr>
                                        <td style="color:#777777;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;text-transform:uppercase;letter-spacing:0.8px;">
                                            Submitted ${submittedAt}
                                        </td>
                                        <td align="right" style="color:#777777;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;text-transform:uppercase;letter-spacing:0.8px;">
                                            avrash.com
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`;

    const text = [
        "NEW PROJECT INQUIRY",
        "",
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : null,
        "",
        "Message:",
        input.message,
        "",
        `Locale: ${input.locale.toUpperCase()}`,
        `Submitted: ${formatSubmittedAt(input.submittedAt)}`,
    ]
        .filter((line): line is string => line !== null)
        .join("\n");

    return {
        subject: `New project inquiry from ${subjectName}`,
        html,
        text,
    };
}
