#!/usr/bin/env node
// Costruisce data/auto.json: catalogo marca/modello/carburante delle auto immatricolate in Italia
// (2010–oggi) con consumo omologato e consumo reale stimato. Fonte: EEA, "Monitoring of CO2 emissions
// from passenger cars" (Reg. UE 2019/631), interrogata via l'endpoint SQL pubblico discodata.
// Zero dipendenze. Eseguito ogni mese da .github/workflows/auto.yml; a mano: node tools/auto.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "auto.json");
const SQL = "https://discodata.eea.europa.eu/sql";

// Tabelle: la combinata (2010–2022) più le annuali recenti (F = finale, P = provvisoria).
const TABLES = ["co2cars", "co2cars_2023Fv28", "co2cars_2024Fv30", "co2cars_2025Pv31"];

// Carburante EEA → chiave dell'app.
const FUEL = {
  "petrol": "benzina", "diesel": "diesel", "lpg": "gpl", "ng": "metano", "ng-biomethane": "metano",
  "electric": "elettrica", "petrol/electric": "ibrida", "diesel/electric": "ibrida-diesel",
  "e85": "benzina", "hydrogen": null, "unknown": null, "other": null,
};
// g CO2 per litro (kg per metano) bruciato: per ricavare il consumo dalla CO2 quando manca il dato diretto.
const CO2_PER_UNIT = { benzina: 2320, diesel: 2640, gpl: 1660, metano: 2750, ibrida: 2320, "ibrida-diesel": 2640 };
// Divario medio tra omologazione e strada (ICCT/Spritmonitor): WLTP +14%, NEDC (fino al 2017 circa) +35%.
const GAP = { wltp: 1.14, nedc: 1.35 };

async function sql(query) {
  const u = new URL(SQL); u.searchParams.set("query", query); u.searchParams.set("p", "1"); u.searchParams.set("nrOfHits", "100000");
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "app-al-giorno (github.com/capozzoligiofra/app-al-giorno)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.errors) throw new Error(JSON.stringify(d.errors).slice(0, 200));
      return d.results || [];
    } catch (e) {
      if (t >= 3) throw new Error(`${query.slice(0, 60)}…: ${e.message}`);
      await new Promise(res => setTimeout(res, 5000 * t));
    }
  }
}

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const title = (s) => String(s).toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/(\d)([a-z])/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Gti|Gtd|Tdi|Tsi|Tfsi|Hdi|Cdi|Amg|Rs|Suv|Mpv|Awd|4x4|4wd|Xdrive|Sw|Gt|St|Cc|Cv|Hev|Phev|Mhev|Ev|Ii|Iii|Iv|Vi)\b/g, (m) => m.toUpperCase());
// "FIAT PANDA 4X4" con marca FIAT → "PANDA 4X4"; toglie anche i doppi spazi.
function cleanModel(mk, cn) {
  let m = norm(cn);
  const k = norm(mk);
  if (k && m.startsWith(k + " ")) m = m.slice(k.length + 1);
  return m.replace(/\s+/g, " ").trim();
}
const MAKE_ALIAS = { "MERCEDES BENZ": "MERCEDES-BENZ", "MERCEDES": "MERCEDES-BENZ", "MERCEDES AMG": "MERCEDES-BENZ", "VW": "VOLKSWAGEN", "VOLKSWAGEN VW": "VOLKSWAGEN", "ALFA": "ALFA ROMEO", "BMW I": "BMW", "CITROEN": "CITROËN", "SKODA": "ŠKODA", "LANDROVER": "LAND ROVER", "ROLLS ROYCE": "ROLLS-ROYCE",
  "DR MOTOR COMPANY": "DR", "DS AUTOMOBILES": "DS", "MITSUBISHI MOTORS CORPORATION": "MITSUBISHI", "MITSUBISHI MOTORS THAILAND": "MITSUBISHI", "MITSUBISHI MOTORS THAILAND LTD": "MITSUBISHI",
  "AUTOMOBILI LAMBORGHINI S P A": "LAMBORGHINI", "SSANGJONG": "SSANGYONG", "KG MOBILITY": "SSANGYONG", "FORD CNG TECHNIK": "FORD", "FORD W GMBH": "FORD", "LANCIA AUTOBIANCHI": "LANCIA",
  "FIAT INNOCENTI": "FIAT", "MORGAN MOTOR": "MORGAN", "SHINERAY SWM JINBEI SRM": "SWM", "SHINERAY": "SWM", "INEOS GRENADIER": "INEOS", "SOCIETE DES AUTOMOBILES ALPINE SAA": "ALPINE", "ROVER CARS": "ROVER", "LYNK CO": "LYNK & CO" };
function cleanMake(mk) { const k = norm(mk); return MAKE_ALIAS[k] || k; }

export async function build() {
  const acc = new Map(); // chiave marca|modello|fuel → { n, fcSum, co2wSum, co2nSum, whSum, ccSum, kwSum, years }
  for (const t of TABLES) {
    const q = `SELECT Mk, Cn, Ft, Year, COUNT(*) AS n, SUM(CASE WHEN TRY_CAST(R AS int) > 0 THEN TRY_CAST(R AS int) ELSE 1 END) AS reg, ` +
      `AVG(TRY_CAST(Fc AS float)) AS fc, AVG(TRY_CAST([Ewltp (g/km)] AS float)) AS wltp, AVG(TRY_CAST([Enedc (g/km)] AS float)) AS nedc, ` +
      `AVG(TRY_CAST([Z (Wh/km)] AS float)) AS wh, AVG(TRY_CAST([Ec (cm3)] AS float)) AS cc, AVG(TRY_CAST([Ep (KW)] AS float)) AS kw ` +
      `FROM [CO2Emission].[latest].[${t}] WHERE MS='IT' AND Cn IS NOT NULL AND Mk IS NOT NULL GROUP BY Mk, Cn, Ft, Year`;
    const rows = await sql(q);
    console.error(`${t}: ${rows.length} gruppi`);
    for (const r of rows) {
      const fuel = FUEL[String(r.Ft || "").toLowerCase().trim()];
      if (!fuel) continue;
      const make = cleanMake(r.Mk), model = cleanModel(r.Mk, r.Cn);
      if (!make || !model || model.length > 40) continue;
      const key = `${make}|${model}|${fuel}`;
      const a = acc.get(key) || { make, model, fuel, reg: 0, dich: 0, dichN: 0, reale: 0, realeN: 0, wltpN: 0, nedcN: 0, wh: 0, whN: 0, cc: 0, ccN: 0, kw: 0, kwN: 0, y0: 9999, y1: 0 };
      const reg = Number(r.reg) || Number(r.n) || 0;
      a.reg += reg;
      const add = (k, v) => { if (v != null && Number.isFinite(+v) && +v > 0) { a[k] += +v * reg; a[k + "N"] += reg; } };
      add("wh", r.wh); add("cc", r.cc); add("kw", r.kw);
      // consumo del gruppo: Fc (WLTP diretto) > CO2 WLTP > CO2 NEDC; ognuno con il proprio divario strada/omologazione
      if (fuel !== "elettrica") {
        const f = CO2_PER_UNIT[fuel];
        let d = null, gap = null;
        if (+r.fc > 0) { d = +r.fc; gap = GAP.wltp; a.wltpN += reg; }
        else if (+r.wltp > 0) { d = +r.wltp / f * 100; gap = GAP.wltp; a.wltpN += reg; }
        else if (+r.nedc > 0) { d = +r.nedc / f * 100; gap = GAP.nedc; a.nedcN += reg; }
        if (d) { a.dich += d * reg; a.dichN += reg; a.reale += d * gap * reg; a.realeN += reg; }
      }
      const y = Number(r.Year); if (y) { a.y0 = Math.min(a.y0, y); a.y1 = Math.max(a.y1, y); }
      acc.set(key, a);
    }
  }
  const items = [];
  for (const a of acc.values()) {
    if (a.reg < 20) continue; // modelli rarissimi o refusi nei nomi
    const avg = (k) => a[k + "N"] ? a[k] / a[k + "N"] : null;
    let dichiarato = null, reale = null, base = null, unit = "l";
    if (a.fuel === "elettrica") {
      const wh = avg("wh"); if (!wh) continue;
      dichiarato = wh / 10; reale = dichiarato * 1.2; base = "wltp"; unit = "kWh";
    } else {
      if (!a.dichN) continue;
      dichiarato = a.dich / a.dichN; reale = a.reale / a.realeN;
      base = a.wltpN >= a.nedcN ? "wltp" : "nedc";
      if (a.fuel === "metano") unit = "kg";
    }
    if (a.fuel === "ibrida" && dichiarato < 1.5) continue; // plug-in con consumo "combinato" irrealistico: non utile per un viaggio
    items.push({
      marca: a.make, modello: title(a.model), carburante: a.fuel,
      dichiarato: Math.round(dichiarato * 10) / 10, reale: Math.round(reale * 10) / 10, unita: unit, base,
      cc: avg("cc") ? Math.round(avg("cc") / 50) * 50 : null, kw: avg("kw") ? Math.round(avg("kw")) : null,
      anni: a.y0 === a.y1 ? String(a.y0) : `${a.y0}–${a.y1}`, n: a.reg,
    });
  }
  items.sort((x, y) => x.marca.localeCompare(y.marca) || y.n - x.n);
  const marche = {};
  for (const it of items) (marche[it.marca] ??= []).push(it);
  const out = {
    updated: new Date().toISOString().slice(0, 10),
    source: "EEA – Monitoring of CO2 emissions from passenger cars (Reg. UE 2019/631), immatricolazioni in Italia 2010–oggi",
    note: "dichiarato = consumo omologato (WLTP; NEDC per i modelli più vecchi), reale = stima su strada (WLTP +14%, NEDC +35%, elettriche +20%); l/100 km, kg/100 km per il metano, kWh/100 km per le elettriche",
    modelli: items.length, marche,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().then(o => console.log(`auto.json: ${o.modelli} modelli, ${Object.keys(o.marche).length} marche`))
    .catch(e => { console.error(e.message); process.exit(1); });
}
