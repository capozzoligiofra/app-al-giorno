#!/usr/bin/env node
// Scarica gli open data MIMIT (prezzi comunicati da ogni distributore) e scrive data/carburanti.json
// con le medie self-service per regione e provincia. Zero dipendenze. Eseguito ogni mattina da
// .github/workflows/carburanti.yml; a mano: node tools/carburanti.mjs
// Fonte: https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "carburanti.json");
const URL_PREZZI = "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv";
const URL_IMPIANTI = "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv";

// Sigla provincia → regione (le regioni a statuto speciale con due province autonome restano distinte).
const REGIONE = {
  AG: "Sicilia", CL: "Sicilia", CT: "Sicilia", EN: "Sicilia", ME: "Sicilia", PA: "Sicilia", RG: "Sicilia", SR: "Sicilia", TP: "Sicilia",
  CA: "Sardegna", NU: "Sardegna", OR: "Sardegna", SS: "Sardegna", SU: "Sardegna", CI: "Sardegna", VS: "Sardegna", OG: "Sardegna", OT: "Sardegna",
  CZ: "Calabria", CS: "Calabria", KR: "Calabria", RC: "Calabria", VV: "Calabria",
  BA: "Puglia", BT: "Puglia", BR: "Puglia", FG: "Puglia", LE: "Puglia", TA: "Puglia",
  MT: "Basilicata", PZ: "Basilicata",
  AV: "Campania", BN: "Campania", CE: "Campania", NA: "Campania", SA: "Campania",
  CB: "Molise", IS: "Molise",
  AQ: "Abruzzo", CH: "Abruzzo", PE: "Abruzzo", TE: "Abruzzo",
  FR: "Lazio", LT: "Lazio", RI: "Lazio", RM: "Lazio", VT: "Lazio",
  PG: "Umbria", TR: "Umbria",
  AN: "Marche", AP: "Marche", FM: "Marche", MC: "Marche", PU: "Marche",
  AR: "Toscana", FI: "Toscana", GR: "Toscana", LI: "Toscana", LU: "Toscana", MS: "Toscana", PI: "Toscana", PO: "Toscana", PT: "Toscana", SI: "Toscana",
  BO: "Emilia-Romagna", FC: "Emilia-Romagna", FE: "Emilia-Romagna", MO: "Emilia-Romagna", PC: "Emilia-Romagna", PR: "Emilia-Romagna", RA: "Emilia-Romagna", RE: "Emilia-Romagna", RN: "Emilia-Romagna",
  GE: "Liguria", IM: "Liguria", SP: "Liguria", SV: "Liguria",
  AL: "Piemonte", AT: "Piemonte", BI: "Piemonte", CN: "Piemonte", NO: "Piemonte", TO: "Piemonte", VB: "Piemonte", VC: "Piemonte",
  AO: "Valle d'Aosta",
  BG: "Lombardia", BS: "Lombardia", CO: "Lombardia", CR: "Lombardia", LC: "Lombardia", LO: "Lombardia", MB: "Lombardia", MI: "Lombardia", MN: "Lombardia", PV: "Lombardia", SO: "Lombardia", VA: "Lombardia",
  BZ: "Trentino-Alto Adige (Bolzano)", TN: "Trentino-Alto Adige (Trento)",
  BL: "Veneto", PD: "Veneto", RO: "Veneto", TV: "Veneto", VE: "Veneto", VI: "Veneto", VR: "Veneto",
  GO: "Friuli-Venezia Giulia", PN: "Friuli-Venezia Giulia", TS: "Friuli-Venezia Giulia", UD: "Friuli-Venezia Giulia",
};
// Nomi carburante MIMIT → chiave usata dalle app. Tutto il resto (premium, HVO, ecc.) viene ignorato.
const CARBURANTE = { "Benzina": "benzina", "Gasolio": "diesel", "GPL": "gpl", "Metano": "metano" };
// Fuori da questi intervalli (€/l o €/kg) il prezzo è un errore di digitazione del gestore.
const RANGE = { benzina: [1.2, 3.2], diesel: [1.2, 3.2], gpl: [0.4, 1.5], metano: [0.8, 3.0] };

async function download(url, tries = 3) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "app-al-giorno (github.com/capozzoligiofra/app-al-giorno)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (t >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 3000 * t));
    }
  }
}
// I CSV MIMIT hanno una prima riga "Estrazione del YYYY-MM-DD" e poi l'intestazione, separatore "|".
function parse(text) {
  const lines = text.split(/\r?\n/);
  const date = (lines[0].match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  const header = lines[1].split("|");
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split("|");
    if (cells.length < header.length) continue;
    const row = {};
    header.forEach((h, k) => { row[h.trim()] = cells[k]; });
    rows.push(row);
  }
  return { date, rows };
}
const round3 = (v) => Math.round(v * 1000) / 1000;
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

export async function build() {
  const prezzi = await download(URL_PREZZI);   // in sequenza: il server MIMIT non gradisce due download insieme
  const impianti = await download(URL_IMPIANTI);
  const P = parse(prezzi), I = parse(impianti);
  const provOf = new Map();
  for (const r of I.rows) if (r.idImpianto && r.Provincia) provOf.set(r.idImpianto, r.Provincia.trim().toUpperCase());

  const byProv = {}, byReg = {}, naz = {};
  const add = (bucket, key, fuel, v) => { ((bucket[key] ??= {})[fuel] ??= []).push(v); };
  let usati = 0;
  for (const r of P.rows) {
    const fuel = CARBURANTE[(r.descCarburante || "").trim()];
    if (!fuel || r.isSelf !== "1") continue; // solo prezzi self service, che sono quelli comparabili
    const v = parseFloat(r.prezzo);
    if (!Number.isFinite(v) || v < RANGE[fuel][0] || v > RANGE[fuel][1]) continue;
    const prov = provOf.get(r.idImpianto);
    if (!prov || !REGIONE[prov]) continue;
    add(byProv, prov, fuel, v); add(byReg, REGIONE[prov], fuel, v); (naz[fuel] ??= []).push(v);
    usati++;
  }
  const avg = (bucket) => Object.fromEntries(Object.entries(bucket).sort().map(([k, fuels]) =>
    [k, Object.fromEntries(Object.entries(fuels).filter(([, a]) => a.length >= 3).map(([f, a]) => [f, round3(mean(a))]))]));
  const out = {
    updated: P.date,
    generated: new Date().toISOString().slice(0, 10),
    source: "MIMIT – Osservaprezzi carburanti, prezzi self service comunicati dai gestori (open data)",
    note: "Medie aritmetiche dei prezzi self service comunicati; €/litro (metano €/kg).",
    stations: usati,
    italia: Object.fromEntries(Object.entries(naz).map(([f, a]) => [f, round3(mean(a))])),
    regioni: avg(byReg),
    province: avg(byProv),
    regioneDiProvincia: REGIONE,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  const text = JSON.stringify(out, null, 1) + "\n";
  const changed = !existsSync(OUT) || readFileSync(OUT, "utf8") !== text;
  writeFileSync(OUT, text);
  return { out, changed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().then(({ out, changed }) => {
    console.log(`carburanti.json: dati del ${out.updated}, ${out.stations} prezzi, Italia ${JSON.stringify(out.italia)} ${changed ? "(aggiornato)" : "(invariato)"}`);
  }).catch(e => { console.error(e.message); process.exit(1); });
}
