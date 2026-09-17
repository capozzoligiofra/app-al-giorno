#!/usr/bin/env node
// Quality gate per una singola app: node tools/check.mjs apps/<cartella>
// Verifica che l'app sia un unico index.html autosufficiente, senza risorse o chiamate esterne,
// con i metadati validi. Exit code 1 e lista delle violazioni se qualcosa non va.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateMeta } from "./build.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MAX_BYTES = 300 * 1024;
const ALLOWED_FILES = new Set(["index.html", "app.json", "README.md"]);

// Pattern che indicano dipendenze o traffico verso l'esterno. Ognuno: [regex, messaggio].
const FORBIDDEN = [
  [/<script[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i, "<script src> verso URL esterno"],
  [/<link(?![^>]+rel\s*=\s*["'](canonical|alternate|license|me)["'])[^>]+href\s*=\s*["']?\s*(https?:)?\/\//i, "<link href> verso URL esterno (ammesso solo rel=canonical/alternate)"],
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
  [/<meta[^>]+name\s*=\s*["']viewport["'][^>]*viewport-fit\s*=\s*cover/i, 'il viewport deve includere viewport-fit=cover (mobile)'],
  [/<meta[^>]+name\s*=\s*["']theme-color["']/i, 'manca <meta name="theme-color"> coerente con la palette (mobile)'],
  [/@media[^{]*min-width/i, "manca una media query min-width: il CSS deve essere mobile-first (desktop come miglioramento progressivo)"],
];

// Regole mobile verificate sul CSS/HTML (euristiche: segnalano pattern che su telefono fanno male).
const MOBILE = [
  [/100vh/i, "usa 100dvh al posto di 100vh (barre del browser mobile)"],
  [/@media[^{]*max-width\s*:\s*(1[0-9]{3}|[5-9][0-9]{2})px/i, "media query max-width per desktop: progetta mobile-first e usa min-width"],
  [/font-size\s*:\s*(1[0-3]|[0-9])px/i, "font-size sotto i 14px: illeggibile su telefono"],
];

// SEO e monetizzazione (vedi CLAUDE.md): obbligatori per le app con blocco `business`.
const BUSINESS = [
  [/<meta[^>]+name\s*=\s*["']description["'][^>]+content\s*=\s*["'][^"']{120,170}["']/i, "meta description mancante o fuori misura (120–160 caratteri)"],
  [/<link[^>]+rel\s*=\s*["']canonical["'][^>]+href\s*=\s*["']https:\/\/[^"']+\/apps\/[a-z0-9-]+\/?["']/i, "manca <link rel=\"canonical\"> con l'URL pubblico dell'app"],
  [/<meta[^>]+property\s*=\s*["']og:title["']/i, "manca og:title"],
  [/<meta[^>]+property\s*=\s*["']og:description["']/i, "manca og:description"],
  [/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"WebApplication"/i, "manca il JSON-LD WebApplication"],
  [/<h1[\s>]/i, "manca un <h1>"],
  [/<section[^>]+id\s*=\s*["']guida["']/i, 'manca <section id="guida"> con la guida testuale'],
  [/<script[^>]+src\s*=\s*["']\.\.\/\.\.\/assets\/monetize\.js["']/i, "manca <script src=\"../../assets/monetize.js\">"],
  [/data-ad=/i, "manca almeno un segnaposto data-ad"],
  [/data-support/i, "manca il segnaposto data-support"],
  [/data-pro=/i, "manca almeno una funzione Pro (data-pro)"],
  [/\.\.\/\.\.\/privacy\.html/, "manca il link alla privacy (../../privacy.html)"],
];
const MIN_GUIDE_WORDS = 350;

function visibleWords(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  return text.split(/\s+/).filter(w => /[a-zà-ú]{2,}/i.test(w)).length;
}

function businessProblems(meta, html) {
  if (!meta?.business) return [];
  const problems = [];
  for (const [re, msg] of BUSINESS) if (!re.test(html)) problems.push(msg);
  const words = visibleWords(html);
  if (words < MIN_GUIDE_WORDS) problems.push(`testo visibile troppo scarso: ${words} parole (minimo ${MIN_GUIDE_WORDS}: guida, esempi, FAQ)`);
  const kw = meta.business.keyword?.toLowerCase();
  if (kw) {
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "";
    const strip = (t) => t.replace(/<[^>]+>/g, "").toLowerCase();
    const first = kw.split(/\s+/)[0];
    if (!strip(title).includes(first)) problems.push(`il <title> non contiene la keyword ("${kw}")`);
    if (!strip(h1).includes(first)) problems.push(`l'<h1> non contiene la keyword ("${kw}")`);
    if (title.length > 65) problems.push(`<title> troppo lungo (${title.length} caratteri, max 60–65)`);
  }
  // Ogni funzione Pro dichiarata deve avere il suo data-pro
  for (const f of meta.business.pro || []) {
    const re = new RegExp(`data-pro\\s*=\\s*["']${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
    if (!re.test(html)) problems.push(`funzione Pro dichiarata ma senza <section data-pro="${f}">`);
  }
  return problems;
}

// Design: le scelte devono differire da quelle delle app precedenti (vedi CLAUDE.md, DESIGN).
function designProblems(meta, folder) {
  const problems = [];
  const catalogPath = join(ROOT, "apps.json");
  if (!existsSync(catalogPath) || !meta?.design) return problems;
  let apps;
  try { apps = JSON.parse(readFileSync(catalogPath, "utf8")).apps || []; } catch { return problems; }
  const previous = apps.filter(a => a.slug !== folder && a.design).sort((a, b) => (a.slug < b.slug ? 1 : -1));
  const isImprovement = apps.some(a => a.slug === folder); // app già esistente: le regole di novità non si applicano
  if (isImprovement || !previous.length) return problems;
  const last = previous[0], last4 = previous.slice(0, 4);
  for (const k of ["layout", "palette", "font"]) {
    if (last.design[k] === meta.design[k]) problems.push(`design.${k} "${meta.design[k]}" è uguale all'app precedente (${last.slug}): scegline un altro`);
  }
  for (const k of ["layout", "palette"]) {
    const hit = last4.find(a => a.design[k] === meta.design[k]);
    if (hit && hit !== last) problems.push(`design.${k} "${meta.design[k]}" già usato di recente (${hit.slug}): deve differire dalle ultime 4 app`);
  }
  return problems;
}

export function checkApp(dir) {
  const problems = [];
  const folder = basename(resolve(dir));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${dir} non è una cartella`];

  for (const f of readdirSync(dir)) {
    if (!ALLOWED_FILES.has(f)) problems.push(`file non ammesso: ${f} (solo index.html, app.json, README.md)`);
  }

  const metaPath = join(dir, "app.json");
  let meta = null;
  if (!existsSync(metaPath)) problems.push("app.json mancante");
  else {
    try { meta = JSON.parse(readFileSync(metaPath, "utf8")); problems.push(...validateMeta(meta, folder)); }
    catch (e) { problems.push(`app.json non è JSON valido: ${e.message}`); }
  }
  problems.push(...designProblems(meta, folder));
  if (meta && !meta.business) console.warn(`  (avviso) ${folder}: app senza blocco "business" — modello precedente; va convertita (vedi CLAUDE.md, MERCATO)`);

  const htmlPath = join(dir, "index.html");
  if (!existsSync(htmlPath)) { problems.push("index.html mancante"); return problems; }
  const size = statSync(htmlPath).size;
  if (size > MAX_BYTES) problems.push(`index.html troppo grande: ${(size / 1024).toFixed(0)} KB > ${MAX_BYTES / 1024} KB`);
  const html = readFileSync(htmlPath, "utf8");

  for (const [re, msg] of REQUIRED) if (!re.test(html)) problems.push(msg);
  problems.push(...businessProblems(meta, html));
  for (const [re, msg] of MOBILE) {
    const m = html.match(re);
    if (m) problems.push(`${msg} (riga ${html.slice(0, m.index).split("\n").length})`);
  }
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
