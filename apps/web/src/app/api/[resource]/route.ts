import { NextResponse } from "next/server";
import { getContentResource } from "@/shared/api/contentStore";

interface RouteParams {
    params: Promise<{ resource: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { resource } = await params;
    const data = getContentResource(resource);

    if (data === undefined) {
        return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 });
    }

    return NextResponse.json(data);
}
