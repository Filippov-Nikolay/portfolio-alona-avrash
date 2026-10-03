// Generates the "peek blend" images used by ToolsSection's Card: each
// source image gets a copy where the top stays sharp and the bottom fades
// into a real (baked-in) blur, so the part of the card that sits under the
// folder reads as genuinely blurred while the part sticking out above it
// stays crisp.
//
// This exists because doing the same thing live in CSS (a blurred
// duplicate layer clipped to the folder's shape, meant to sit above the
// sharp original) never rendered correctly in this project's environment
// regardless of z-index, isolation, mask, or overflow settings tried — see
// git history on src/widgets/ToolsSection/components/Card. Baking the
// blend into the image itself sidesteps that entirely: there is only ever
// one image element at runtime, so there is no layering to get wrong.
//
// Usage: node scripts/generate-tool-peek-blends.mjs
// Re-run whenever entities/tool/model/tools.json references a new image.

import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOOLS_JSON = path.join(ROOT, "src/entities/tool/model/tools.json");
const OUT_DIR = path.join(ROOT, "public/assets/tools/peek-blend");

const FOLD_START = 0.15;
const FOLD_END = 0.35;
const BLUR_SIGMA = 35;

async function makeBlend(srcPath, outPath) {
    const { width, height } = await sharp(srcPath).metadata();

    const gradientSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="white" stop-opacity="0"/>
                    <stop offset="${FOLD_START}" stop-color="white" stop-opacity="0"/>
                    <stop offset="${FOLD_END}" stop-color="white" stop-opacity="1"/>
                    <stop offset="1" stop-color="white" stop-opacity="1"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`;

    const blurred = await sharp(srcPath).blur(BLUR_SIGMA).toBuffer();
    const maskedBlurred = await sharp(blurred)
        .composite([{ input: Buffer.from(gradientSvg), blend: "dest-in" }])
        .png()
        .toBuffer();

    await sharp(srcPath)
        .composite([{ input: maskedBlurred, blend: "over" }])
        .toFile(outPath);
}

async function main() {
    const tools = JSON.parse(await readFile(TOOLS_JSON, "utf8"));
    const uniqueSrcs = new Set(tools.flatMap((tool) => tool.images.map((img) => img.src)));

    await mkdir(OUT_DIR, { recursive: true });

    for (const src of uniqueSrcs) {
        const filename = path.basename(src);
        const srcPath = path.join(ROOT, "public", src);
        const outPath = path.join(OUT_DIR, filename);
        await makeBlend(srcPath, outPath);
        console.log("generated", path.relative(ROOT, outPath));
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
