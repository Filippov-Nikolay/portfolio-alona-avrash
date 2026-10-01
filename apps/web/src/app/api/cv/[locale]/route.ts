import { CV_LOCALE_PATTERN, type ResolvedCv } from "@avrash/content-schema";
import { getCv } from "@/entities/cv/api/getCv";
import { getCvFile } from "@/entities/cv/api/getCvFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
    params: Promise<{ locale: string }>;
}

const unavailable = () =>
    new Response("No CV is currently available.", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    });

function downloadHeaders(cv: ResolvedCv) {
    return {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="alona-avrash-cv-${cv.locale}.pdf"; filename*=UTF-8''${encodeURIComponent(cv.document.fileName)}`,
        "Cache-Control": "private, no-cache",
        "Content-Language": cv.locale,
        ETag: `"${cv.document.id}"`,
        "X-Content-Type-Options": "nosniff",
    };
}

export async function GET(request: Request, { params }: RouteContext) {
    const { locale } = await params;
    if (!CV_LOCALE_PATTERN.test(locale)) return unavailable();
    try {
        let cv = await getCv(locale, { fresh: true });
        if (!cv) return unavailable();
        const etag = downloadHeaders(cv).ETag;
        const matches = request.headers
            .get("if-none-match")
            ?.split(",")
            .some((tag) => tag.trim().replace(/^W\//, "") === etag || tag.trim() === "*");
        if (matches) return new Response(null, { status: 304, headers: downloadHeaders(cv) });
        let bytes: Uint8Array;
        try {
            bytes = await getCvFile(cv.document);
        } catch (error) {
            const latest = await getCv(locale, { fresh: true });
            if (!latest) return unavailable();
            if (latest.document.id === cv.document.id) throw error;
            cv = latest;
            bytes = await getCvFile(cv.document);
        }
        return new Response(new Uint8Array(bytes), {
            headers: {
                ...downloadHeaders(cv),
                "Content-Length": String(bytes.length),
            },
        });
    } catch (error) {
        console.error("[cv] Download failed", error);
        return new Response("The CV is temporarily unavailable. Please try again.", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
        });
    }
}
