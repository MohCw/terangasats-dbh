import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dir = "dist/assets";
const LIMIT = 300 * 1024;
let total = 0;
for (const f of readdirSync(dir)) {
  if (!/\.(js|css)$/.test(f) || f.includes("breez") || f.includes(".wasm")) continue;
  const size = gzipSync(readFileSync(join(dir, f))).length;
  total += size;
  console.log(`${f}: ${(size / 1024).toFixed(1)} Ko gzip`);
}
console.log(`Total (hors wallet) : ${(total / 1024).toFixed(1)} Ko gzip, limite 300 Ko`);
if (total > LIMIT) { console.error("Budget de poids dépassé"); process.exit(1); }
