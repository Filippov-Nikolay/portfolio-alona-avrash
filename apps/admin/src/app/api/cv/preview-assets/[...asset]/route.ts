import { readFile } from "node:fs/promises";
import path from "node:path";
import pdfPackage from "pdfjs-dist/package.json";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";

const directory = path.join(process.cwd(), "node_modules", "pdfjs-dist");

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
    await requireAdminSession();
    const { asset } = await params;
    const [requestedVersion, ...segments] = asset;
    const file = segments.join("/");
    if (
        requestedVersion !== pdfPackage.version ||
        !/^(legacy\/build\/pdf\.worker\.min\.mjs|(cmaps|standard_fonts|wasm)\/[a-zA-Z0-9_.-]+)$/.test(
            file
        )
    ) {
        return new Response("Not found", { status: 404 });
    }
    try {
        const bytes = await readFile(path.join(directory, file));
        return new Response(bytes, {
            headers: {
                "Content-Type": file.endsWith(".mjs")
                    ? "text/javascript"
                    : file.endsWith(".wasm")
                      ? "application/wasm"
                      : "application/octet-stream",
                "Cache-Control": "private, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("[cv] Could not read PDF preview asset", error);
        return new Response("Not found", { status: 404 });
    }
}
