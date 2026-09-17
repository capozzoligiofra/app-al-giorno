#!/usr/bin/env node
// Scansiona apps/*/app.json, valida i metadati e scrive apps.json + apps.js (il catalogo letto dal sito).
// Exit code 1 se anche un solo app.json è invalido: l'agente deve correggere prima di committare.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPS_DIR = join(ROOT, "apps");
const OUT = join(ROOT, "apps.json");
const OUT_JS = join(ROOT, "apps.js"); // stesso contenuto, caricabile via <script> anche da file://

export const CATEGORIES = [
  "produttivita", "salute-benessere", "finanza-personale", "studio-apprendimento",
  "casa-cucina", "creativita", "utility-sviluppatori", "giochi-educativi",
  "calcolatori-convertitori", "testo-scrittura",
];
const SOURCES = ["richiesta", "autonoma"];
const MONETIZATION = ["adsense", "affiliate", "pro", "support"];
const OUT_SITEMAP = join(ROOT, "sitemap.xml");
const OUT_ROBOTS = join(ROOT, "robots.txt");

function readConfig() {
  try { return JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")); } catch { return {}; }
}

// Valida il blocco business (obbligatorio per le app create dopo il cambio di modello).
export function validateBusiness(b) {
  const errors = [];
  if (!b || typeof b !== "object") return [`"business" mancante: serve keyword, intent, target, edge, monetization, pro (vedi CLAUDE.md, MERCATO)`];
  const str = (k, max) => {
    if (typeof b[k] !== "string" || !b[k].trim()) errors.push(`"business.${k}" mancante`);
    else if (max && b[k].length > max) errors.push(`"business.${k}" supera ${max} caratteri`);
  };
  str("keyword", 80); str("intent", 300); str("target", 200); str("edge", 300);
  if (typeof b.keyword === "string" && b.keyword !== b.keyword.toLowerCase()) errors.push(`"business.keyword" deve essere in minuscolo`);
  if (!Array.isArray(b.keywords) || b.keywords.length < 2 || b.keywords.length > 5 || !b.keywords.every(k => typeof k === "string")) errors.push(`"business.keywords" deve avere 2–5 varianti`);
  if (!Array.isArray(b.competitors) || b.competitors.length < 1 || b.competitors.length > 4) errors.push(`"business.competitors" deve avere 1–4 voci`);
  if (!Array.isArray(b.monetization) || !b.monetization.length || !b.monetization.every(m => MONETIZATION.includes(m))) errors.push(`"business.monetization" deve essere un sottoinsieme non vuoto di ${MONETIZATION.join(", ")}`);
  if (!Array.isArray(b.pro) || b.pro.length < 1 || b.pro.length > 4 || !b.pro.every(k => typeof k === "string")) errors.push(`"business.pro" deve elencare 1–4 funzioni Pro implementate`);
  if (b.affiliate !== undefined && !(Array.isArray(b.affiliate) && b.affiliate.every(a => a && typeof a.t === "string" && typeof a.q === "string"))) errors.push(`"business.affiliate" deve essere un array di { t, q }`);
  return errors;
}
const STATUSES = ["pronta", "bozza"];
const SLUG_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DESIGN = {
  layout: ["card-stack", "single-column", "tabs", "wizard", "dashboard", "split", "canvas", "list-detail", "fullscreen-tool", "sheet"],
  palette: ["verde-bosco", "arancio-caldo", "blu-notte", "viola-elettrico", "rosso-mattone", "giallo-senape", "grigio-carta", "azzurro-cielo", "rosa-cipria", "nero-neon", "terracotta", "verde-menta"],
  font: ["sans-geometrico", "serif-editoriale", "mono-tecnico", "rounded", "condensed"],
};

// Valida un app.json e restituisce l'elenco degli errori (vuoto = ok).
export function validateMeta(meta, folderName) {
  const errors = [];
  const str = (k, max) => {
    if (typeof meta[k] !== "string" || !meta[k].trim()) errors.push(`"${k}" mancante o vuoto`);
    else if (max && meta[k].length > max) errors.push(`"${k}" supera ${max} caratteri`);
  };
  str("title", 60);
  str("slug", 60);
  str("date");
  str("description", 160);
  if (meta.slug !== folderName) errors.push(`"slug" (${meta.slug}) diverso dal nome cartella (${folderName})`);
  if (typeof meta.slug === "string" && !SLUG_RE.test(meta.slug)) errors.push(`"slug" non è nel formato YYYY-MM-DD-kebab-case`);
  if (typeof meta.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) errors.push(`"date" non è YYYY-MM-DD`);
  if (typeof meta.slug === "string" && typeof meta.date === "string" && !meta.slug.startsWith(meta.date))
    errors.push(`"slug" deve iniziare con "date"`);
  if (!CATEGORIES.includes(meta.category)) errors.push(`"category" non valida: ${meta.category} (ammesse: ${CATEGORIES.join(", ")})`);
  if (!Array.isArray(meta.tags) || meta.tags.length < 2 || meta.tags.length > 5 || !meta.tags.every(t => typeof t === "string" && /^[a-z0-9àèéìòù\- ]+$/.test(t)))
    errors.push(`"tags" deve essere un array di 2–5 stringhe minuscole`);
  if (!SOURCES.includes(meta.source)) errors.push(`"source" deve essere ${SOURCES.join(" | ")}`);
  if (meta.source === "richiesta" && (typeof meta.request !== "string" || !meta.request.trim()))
    errors.push(`"request" obbligatorio quando source = "richiesta"`);
  if (meta.status !== undefined && !STATUSES.includes(meta.status)) errors.push(`"status" deve essere ${STATUSES.join(" | ")}`);
  if (meta.version !== undefined && !(Number.isInteger(meta.version) && meta.version >= 1)) errors.push(`"version" deve essere un intero >= 1`);
  if (meta.changelog !== undefined && !(Array.isArray(meta.changelog) && meta.changelog.every(c => typeof c === "string"))) errors.push(`"changelog" deve essere un array di stringhe`);
  if (meta.business !== undefined) errors.push(...validateBusiness(meta.business));
  if (!meta.design || typeof meta.design !== "object") errors.push(`"design" mancante: serve { layout, palette, font } (vedi CLAUDE.md, sezione DESIGN)`);
  else for (const k of Object.keys(DESIGN)) {
    if (!DESIGN[k].includes(meta.design[k])) errors.push(`"design.${k}" non valido: ${meta.design[k]} (ammessi: ${DESIGN[k].join(", ")})`);
  }
  return errors;
}

function gitRemoteUrl() {
  try {
    const url = execSync("git config --get remote.origin.url", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return url.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
  } catch { return null; }
}

export function build() {
  if (!existsSync(APPS_DIR)) throw new Error("cartella apps/ mancante");
  const folders = readdirSync(APPS_DIR).filter(f => statSync(join(APPS_DIR, f)).isDirectory()).sort();
  const apps = [];
  const problems = [];
  for (const folder of folders) {
    const metaPath = join(APPS_DIR, folder, "app.json");
    const htmlPath = join(APPS_DIR, folder, "index.html");
    if (!existsSync(metaPath)) { problems.push(`${folder}: app.json mancante`); continue; }
    if (!existsSync(htmlPath)) { problems.push(`${folder}: index.html mancante`); continue; }
    let meta;
    try { meta = JSON.parse(readFileSync(metaPath, "utf8")); }
    catch (e) { problems.push(`${folder}: app.json non è JSON valido (${e.message})`); continue; }
    const errors = validateMeta(meta, folder);
    if (errors.length) { problems.push(...errors.map(e => `${folder}: ${e}`)); continue; }
    apps.push({
      title: meta.title.trim(),
      slug: meta.slug,
      date: meta.date,
      description: meta.description.trim(),
      category: meta.category,
      tags: meta.tags,
      source: meta.source,
      request: meta.source === "richiesta" ? meta.request.trim() : null,
      status: meta.status ?? "pronta",
      version: meta.version ?? 1,
      changelog: meta.changelog ?? [],
      design: { layout: meta.design.layout, palette: meta.design.palette, font: meta.design.font },
      business: meta.business ? {
        keyword: meta.business.keyword, keywords: meta.business.keywords, intent: meta.business.intent,
        target: meta.business.target, edge: meta.business.edge, monetization: meta.business.monetization,
        pro: meta.business.pro, affiliate: meta.business.affiliate || [],
      } : null,
      size: statSync(htmlPath).size,
    });
  }
  if (problems.length) {
    const err = new Error("apps.json NON generato:\n  - " + problems.join("\n  - "));
    err.problems = problems;
    throw err;
  }
  apps.sort((a, b) => (b.slug > a.slug ? 1 : b.slug < a.slug ? -1 : 0));
  const catalog = {
    repo: gitRemoteUrl(),
    count: apps.length,
    categories: CATEGORIES,
    design: DESIGN,
    apps,
  };
  const text = JSON.stringify(catalog, null, 2);
  writeFileSync(OUT, text + "\n");
  writeSeoFiles(apps);
  writeFileSync(OUT_JS, "// GENERATO da tools/build.mjs — non modificare a mano.\nwindow.__APPS__ = " + text + ";\n");
  return catalog;
}

// sitemap.xml e robots.txt per il sito pubblico (base URL in config.json → site_url).
function writeSeoFiles(apps) {
  const base = (readConfig().site_url || "").replace(/\/+$/, "");
  if (!base) return;
  const urls = [`${base}/`, `${base}/privacy.html`, ...apps.filter(a => a.status !== "bozza").map(a => `${base}/apps/${a.slug}/`)];
  const lastmod = (a) => a ? a.date : new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u, i) => `  <url><loc>${u}</loc><lastmod>${lastmod(i >= 2 ? apps[i - 2] : null)}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  writeFileSync(OUT_SITEMAP, xml);
  writeFileSync(OUT_ROBOTS, `User-agent: *\nAllow: /\nDisallow: /tools/\nSitemap: ${base}/sitemap.xml\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const c = build();
    console.log(`apps.json aggiornato: ${c.count} app`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
