// Turns a Blender render into the web plates. Run: node scripts/make-plates.mjs [name]
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const name = process.argv[2] ?? "hero";
const src = `blender/out/${name}.png`;
mkdirSync("public/plates", { recursive: true });
const full = await sharp(src).resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 84 }).toFile(`public/plates/${name}.webp`);
const small = await sharp(src).resize({ width: 1280 }).webp({ quality: 80 }).toFile(`public/plates/${name}-1280.webp`);
console.log(`${name}.webp ${(full.size / 1024).toFixed(0)} KB, ${name}-1280.webp ${(small.size / 1024).toFixed(0)} KB`);
