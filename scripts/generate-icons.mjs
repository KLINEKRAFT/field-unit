/**
 * Generates the app icons procedurally (no image dependencies):
 * a signal-yellow dot-matrix sun on instrument black.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------ png encoder ------------------------------ */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------ icon drawing ----------------------------- */

const BG = [0x11, 0x11, 0x0f];
const YELLOW = [0xff, 0xd8, 0x4a];
const WHITE = [0xee, 0xea, 0xe2];

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    // simple alpha-over compositing against existing pixel
    const na = a / 255;
    px[i] = Math.round(r * na + px[i] * (1 - na));
    px[i + 1] = Math.round(g * na + px[i + 1] * (1 - na));
    px[i + 2] = Math.round(b * na + px[i + 2] * (1 - na));
    px[i + 3] = 255;
  };

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) set(x, y, BG);

  const dot = (cx, cy, radius, color) => {
    for (let y = Math.floor(cy - radius) - 1; y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius) - 1; x <= cx + radius + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= radius - 0.5) set(x, y, color);
        else if (d <= radius + 0.5) set(x, y, color, Math.round(255 * (radius + 0.5 - d)));
      }
    }
  };

  const c = size / 2;
  const unit = size / 512;
  const spacing = 42 * unit;
  const dotR = 13 * unit;
  const sunR = 148 * unit;

  // sun disc as dot grid
  for (let gy = -5; gy <= 5; gy++) {
    for (let gx = -5; gx <= 5; gx++) {
      const x = c + gx * spacing;
      const y = c + gy * spacing;
      if (Math.hypot(x - c, y - c) <= sunR) dot(x, y, dotR, YELLOW);
    }
  }
  // rays at 8 compass points
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    for (const r of [198 * unit, 232 * unit]) {
      dot(c + Math.cos(a) * r, c + Math.sin(a) * r, 10 * unit, WHITE);
    }
  }
  return encodePNG(size, size, px);
}

const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-512.png"), drawIcon(512));
writeFileSync(join(outDir, "icon-192.png"), drawIcon(192));
writeFileSync(join(outDir, "apple-touch-icon.png"), drawIcon(180));
console.log("Icons written to public/icons/");
