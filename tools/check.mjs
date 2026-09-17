#!/usr/bin/env node
// Quality gate per una singola app: node tools/check.mjs apps/<cartella>
// Verifica che l'app sia un unico index.html autosufficiente, senza risorse o chiamate esterne,
// con i metadati validi. Exit code 1 e lista delle violazioni se qualcosa non va.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { validateMeta } from "./build.mjs";

const MAX_BYTES = 300 * 1024;
const ALLOWED_FILES = new Set(["index.html", "app.json", "README.md"]);

// Pattern che indicano dipendenze o traffico verso l'esterno. Ognuno: [regex, messaggio].
const FORBIDDEN = [
  [/<script[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i, "<script src> verso URL esterno"],
  [/<link[^>]+href\s*=\s*["']?\s*(https?:)?\/\//i, "<link href> verso URL esterno"],
  [/@import\s+(url\()?\s*["']?(https?:)?\/\//i, "@import CSS remoto"],
  [/url\(\s*["']?(https?:)?\/\/[^)]*\)/i, "url() CSS verso risorsa remota"],
  [/<(img|iframe|video|audio|source|embed|object)[^>]+(src|data)\s*=\s*["']?\s*(https?:)?\/\//i, "media/iframe remoto"],
  [/\bfetch\s*\(\s*["'`](https?:)?\/\//i, "fetch() verso host esterno"],
  [/\bnew\s+(XMLHttpRequest|WebSocket|EventSource)\b/i, "XMLHttpRequest/WebSocket/EventSource"],
  [/\bnavigator\.sendBeacon\b/i, "sendBeacon (tracking)"],
  [/\bimport\s*\(\s*["'`](https?:)?\/\//i, "import() dinamico remoto"],
  [/\bfrom\s+["'](https?:)?\/\//i, "import ES da URL remoto"],
  [/\b(alert|confirm|prompt)\s*\(/, "alert()/confirm()/prompt() bloccanti: usa UI inline"],
  [/googletagmanager|google-analytics|gtag\(|plausible|matomo|hotjar/i, "tracking/analytics"],
];

const REQUIRED = [
  [/<!doctype html>/i, "manca <!doctype html>"],
  [/<html[^>]*\slang\s*=\s*["']it["']/i, 'manca <html lang="it">'],
  [/<meta[^>]+name\s*=\s*["']viewport["']/i, 'manca <meta name="viewport">'],
  [/<title>\s*[^<\s][^<]*<\/title>/i, "manca un <title> non vuoto"],
  [/\.\.\/\.\.\/index\.html/, 'manca il link "← Tutte le app" verso ../../index.html'],
];

export function checkApp(dir) {
  const problems = [];
  const folder = basename(resolve(dir));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${dir} non è una cartella`];

  for (const f of readdirSync(dir)) {
    if (!ALLOWED_FILES.has(f)) problems.push(`file non ammesso: ${f} (solo index.html, app.json, README.md)`);
  }

  const metaPath = join(dir, "app.json");
  if (!existsSync(metaPath)) problems.push("app.json mancante");
  else {
    try { problems.push(...validateMeta(JSON.parse(readFileSync(metaPath, "utf8")), folder)); }
    catch (e) { problems.push(`app.json non è JSON valido: ${e.message}`); }
  }

  const htmlPath = join(dir, "index.html");
  if (!existsSync(htmlPath)) { problems.push("index.html mancante"); return problems; }
  const size = statSync(htmlPath).size;
  if (size > MAX_BYTES) problems.push(`index.html troppo grande: ${(size / 1024).toFixed(0)} KB > ${MAX_BYTES / 1024} KB`);
  const html = readFileSync(htmlPath, "utf8");

  for (const [re, msg] of REQUIRED) if (!re.test(html)) problems.push(msg);
  for (const [re, msg] of FORBIDDEN) {
    const m = html.match(re);
    if (m) {
      const line = html.slice(0, m.index).split("\n").length;
      problems.push(`${msg} (riga ${line}: ${m[0].slice(0, 60).replace(/\s+/g, " ")})`);
    }
  }
  return problems;
}

const target = process.argv[2];
if (!target) {
  console.error("uso: node tools/check.mjs apps/<cartella>");
  process.exit(2);
}
const problems = checkApp(target);
if (problems.length) {
  console.error(`✗ ${target}: ${problems.length} problema/i`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✓ ${target}: ok`);
