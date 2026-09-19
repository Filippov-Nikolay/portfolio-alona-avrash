import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CONTENT_RESOURCE_TAGS } from "@/shared/api/contentClient";

function isValidSecret(provided: string, expected: string): boolean {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!provided || !isValidSecret(provided, secret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const tag = (body as { tag?: unknown } | null)?.tag;
    if (typeof tag !== "string" || !CONTENT_RESOURCE_TAGS.has(tag)) {
        return NextResponse.json({ error: `Unknown or missing "tag"` }, { status: 400 });
    }

    revalidateTag(tag, { expire: 0 });
    return NextResponse.json({ revalidated: tag });
}
