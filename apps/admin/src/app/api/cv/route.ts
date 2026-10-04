import { revalidatePath } from "next/cache";
import {
    CV_LOCALE_PATTERN,
    cvFileError,
    hasPdfSignature,
    isSiteLocale,
    MAX_CV_BYTES,
} from "@avrash/content-schema";
import { getCvRepository } from "@/entities/cv/api/cvRepository";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { notifyContentChanged } from "@/shared/lib/notifyWeb";

export const runtime = "nodejs";

async function authorize(request: Request, mutation = false): Promise<Response | null> {
    try {
        await requireAdminSession();
    } catch {
        return Response.json({ error: "Please sign in again." }, { status: 401 });
    }
    if (mutation && request.headers.get("origin") !== new URL(request.url).origin) {
        return Response.json({ error: "Invalid request origin." }, { status: 403 });
    }
    return null;
}

function requestedLocale(request: Request): string | null {
    const locale = new URL(request.url).searchParams.get("locale") ?? "";
    return CV_LOCALE_PATTERN.test(locale) ? locale : null;
}

const missingLanguage = () => Response.json({ error: "Choose a CV language." }, { status: 400 });

export async function GET(request: Request) {
    const unauthorized = await authorize(request);
    if (unauthorized) return unauthorized;
    const locale = requestedLocale(request);
    if (!locale) return missingLanguage();
    try {
        const repository = getCvRepository();
        const document = (await repository.get()).files[locale];
        if (!document) return new Response("No CV uploaded for this language.", { status: 404 });
        const params = new URL(request.url).searchParams;
        const version = params.get("v");
        if (version !== null && version !== document.id) {
            return new Response("This CV version is no longer available.", {
                status: 404,
                headers: { "Cache-Control": "private, no-store" },
            });
        }
        const bytes = await repository.download(document);
        const disposition = params.has("download") ? "attachment" : "inline";
        return new Response(new Uint8Array(bytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${disposition}; filename="cv.pdf"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
                "Content-Length": String(bytes.length),
                "Cache-Control": version
                    ? "private, max-age=31536000, immutable"
                    : "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
            },
        });
    } catch (error) {
        console.error("[cv] Preview failed", error);
        return Response.json(
            { error: "Could not load the CV. Please try again." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const unauthorized = await authorize(request, true);
    if (unauthorized) return unauthorized;
    if (Number(request.headers.get("content-length")) > MAX_CV_BYTES + 64 * 1024) {
        return Response.json({ error: "The PDF must be 4 MB or smaller." }, { status: 413 });
    }
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return Response.json({ error: "Choose a PDF document." }, { status: 400 });
    }
    const locale = form.get("locale");
    if (typeof locale !== "string" || !isSiteLocale(locale)) return missingLanguage();
    const file = form.get("file");
    if (!(file instanceof File))
        return Response.json({ error: "Choose a PDF document." }, { status: 400 });
    const error = cvFileError(file);
    if (error) return Response.json({ error }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(bytes)) {
        return Response.json(
            { error: "This file is not a valid PDF. Please export it again." },
            { status: 400 }
        );
    }
    try {
        const content = await getCvRepository().save(locale, file.name, bytes);
        revalidatePath("/global/cv");
        await notifyContentChanged("cv");
        return Response.json({ content });
    } catch (error) {
        console.error("[cv] Save failed", error);
        return Response.json(
            { error: "Could not save the CV. Your current file has not been replaced." },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const unauthorized = await authorize(request, true);
    if (unauthorized) return unauthorized;
    const locale = requestedLocale(request);
    if (!locale) return missingLanguage();
    try {
        const content = await getCvRepository().remove(locale);
        revalidatePath("/global/cv");
        await notifyContentChanged("cv");
        return Response.json({ content });
    } catch (error) {
        console.error("[cv] Delete failed", error);
        return Response.json(
            { error: "Could not delete the CV. Please try again." },
            { status: 500 }
        );
    }
}
