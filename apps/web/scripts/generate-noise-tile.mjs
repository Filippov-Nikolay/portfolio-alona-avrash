// Bake the previous NoiseLayer SVG at its existing CSS tile size.
// Run from any directory: node apps/web/scripts/generate-noise-tile.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../public/assets/noise/hero-noise.png", import.meta.url);
await mkdir(new URL(".", output), { recursive: true });
const svg = `<svg width="128" height="128" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)"/></svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(fileURLToPath(output));
