#!/usr/bin/env node
// Genera chiavi Pass Pro: node tools/chiavi.mjs [quante=10]
// Stampa le chiavi (da conservare e vendere: NON finiscono nel repo) e aggiunge i loro hash
// SHA-256 alla lista keyHashes in assets/monetize.js (che invece è pubblica: da un hash non si risale alla chiave).
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "assets", "monetize.js");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza 0/O, 1/I per evitare confusione
const n = Math.max(1, Math.min(500, Number(process.argv[2]) || 10));

function makeKey() {
  const bytes = randomBytes(12);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `AAG-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
const normalize = (k) => k.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hash = (k) => createHash("sha256").update(normalize(k)).digest("hex");

let src = readFileSync(FILE, "utf8");
const m = src.match(/keyHashes:\s*\[([\s\S]*?)\]/);
if (!m) { console.error("keyHashes non trovato in assets/monetize.js"); process.exit(1); }
const existing = new Set((m[1].match(/"[0-9a-f]{64}"/g) || []).map(s => s.slice(1, -1)));

const keys = [];
while (keys.length < n) {
  const k = makeKey();
  if (!existing.has(hash(k))) { keys.push(k); existing.add(hash(k)); }
}
const list = Array.from(existing).map(h => `        "${h}",`).join("\n");
src = src.replace(/keyHashes:\s*\[[\s\S]*?\]/, `keyHashes: [\n${list}\n      ]`);
writeFileSync(FILE, src);

const out = keys.join("\n") + "\n";
appendFileSync(join(ROOT, "chiavi-pro.txt"), `# generate ${new Date().toISOString()}\n` + out);
console.log(`${keys.length} chiavi generate (hash aggiunti a assets/monetize.js, totale ${existing.size}):\n`);
console.log(out);
console.log("Le chiavi sono anche in chiavi-pro.txt (file ignorato da git: conservalo altrove, es. nel gestore password).");
