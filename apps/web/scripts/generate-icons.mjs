// Renders every favicon and touch icon from public/icon/icon.svg.
// Usage: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const source = fileURLToPath(new URL("icon/icon.svg", publicDir));
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

function render(size) {
    return sharp(source, { density: 300 }).resize(size, size);
}

function icoFromPngs(images) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);

    let offset = header.length + images.length * 16;
    const entries = images.map(({ size, png }) => {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);
        entry.writeUInt8(size >= 256 ? 0 : size, 1);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(png.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += png.length;
        return entry;
    });

    return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

await render(192)
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL("icon/icon.png", publicDir)));

await render(180)
    .flatten({ background: BLACK })
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL("apple-touch-icon.png", publicDir)));

const icoImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
        size,
        png: await render(size).png({ compressionLevel: 9 }).toBuffer(),
    }))
);
await writeFile(new URL("favicon.ico", publicDir), icoFromPngs(icoImages));
