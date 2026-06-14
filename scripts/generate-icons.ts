/**
 * Generates the desktop app icons from build/icon.svg using sharp.
 *
 * Produces:
 *   - build/icon.png  (1024x1024, used by Linux and as a high-res source)
 *   - build/icon.ico  (multi-size Windows icon: 16/32/48/64/128/256, PNG-encoded)
 *
 * The .ico is assembled by hand (PNG-in-ICO, supported on Windows Vista+) so no
 * extra dependency beyond sharp (already present via Next.js) is required.
 *
 * Run: npm run icons
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SVG_PATH = path.join(process.cwd(), "build", "icon.svg");
const PNG_PATH = path.join(process.cwd(), "build", "icon.png");
const ICO_PATH = path.join(process.cwd(), "build", "icon.ico");
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function pngBuffer(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

function buildIco(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width (0 == 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    offset += img.data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const svg = readFileSync(SVG_PATH);

  const png1024 = await sharp(svg, { density: 384 }).resize(1024, 1024).png().toBuffer();
  writeFileSync(PNG_PATH, png1024);

  const images = [];
  for (const size of ICO_SIZES) {
    images.push({ size, data: await pngBuffer(svg, size) });
  }
  writeFileSync(ICO_PATH, buildIco(images));

  console.log(`PASS: wrote ${PNG_PATH} and ${ICO_PATH} (${ICO_SIZES.join(", ")}).`);
}

main().catch((e) => {
  console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
