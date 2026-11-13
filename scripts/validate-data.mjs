// Schema + sanity check for data/rockets.json. Run: npm run check:data
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const data = read("../data/rockets.json");
const schema = read("../data/rockets.schema.json");

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const errors = [];
if (!ajv.validate(schema, data)) {
  for (const e of ajv.errors) errors.push(`${e.instancePath || "/"} ${e.message}`);
}

// Cross-checks the schema cannot express.
const hero = data.hero;
const heroInLineup = data.comparison?.find((r) => r.id === hero?.id);
if (!heroInLineup) errors.push("hero rocket is missing from the comparison line-up");
else if (heroInLineup.height.value !== hero.stackHeight.value) errors.push("hero height differs between hero and comparison");
const ids = data.comparison?.map((r) => r.id) ?? [];
if (new Set(ids).size !== ids.length) errors.push("duplicate rocket ids in comparison");
if (hero && hero.boosterHeight.value + hero.shipHeight.value > hero.stackHeight.value + 0.5)
  errors.push("booster + ship is taller than the full stack");

// Unverified facts are allowed in the file but are listed so they cannot ship unnoticed.
const unverified = [];
const walk = (node, path) => {
  if (!node || typeof node !== "object") return;
  if (node.verified === false) unverified.push(path);
  for (const [k, v] of Object.entries(node)) walk(v, `${path}/${k}`);
};
walk(data, "");

if (errors.length) {
  console.error(`rockets.json: ${errors.length} problem(s)`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`rockets.json OK (${ids.length} rockets, as of ${data.asOf})`);
if (unverified.length) {
  console.log(`${unverified.length} unverified fact(s), must be resolved before Phase 8:`);
  for (const p of unverified) console.log("  - " + p);
}
