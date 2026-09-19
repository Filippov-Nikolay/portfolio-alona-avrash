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
}

export async function submitContactForm(payload: ContactFormPayload): Promise<ContactFormResult> {
    const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("Failed to send the contact form.");
    }

    return response.json() as Promise<ContactFormResult>;
}
