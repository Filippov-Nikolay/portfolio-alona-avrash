export interface ContactFormPayload {
    name: string;
    email: string;
    phone?: string;
    message: string;
    locale: string;
    submittedAt: string;
}

export interface ContactFormResult {
    accepted: true;
    submissionId: string;
}

export async function submitContactForm(payload: ContactFormPayload): Promise<ContactFormResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (process.env.NODE_ENV === "development") {
        console.info("Contact form payload (API pending):", payload);
    }

    return {
        accepted: true,
        submissionId: crypto.randomUUID(),
    };
}
