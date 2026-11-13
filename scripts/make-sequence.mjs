// Turns a Blender frame sequence into web frames plus a manifest.
// Run: node scripts/make-sequence.mjs [name]   (reads blender/out/<name>_000.png ...)
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const name = process.argv[2] ?? "liftoff";
const dir = `public/plates/${name}`;
mkdirSync(dir, { recursive: true });
let count = 0;
let bytes = 0;
let meta = { width: 0, height: 0 };
for (; ; count++) {
  const n = String(count).padStart(3, "0");
  const src = `blender/out/${name}_${n}.png`;
  if (!existsSync(src)) break;
  const out = await sharp(src).webp({ quality: 78 }).toFile(`${dir}/${n}.webp`);
  bytes += out.size;
  meta = { width: out.width, height: out.height };
}
writeFileSync(`data/${name}-plate.json`, JSON.stringify({ base: `/plates/${name}/`, count, ...meta }, null, 2) + "\n");
console.log(`${count} frames, ${(bytes / 1024).toFixed(0)} KB total, ${meta.width}x${meta.height}`);
