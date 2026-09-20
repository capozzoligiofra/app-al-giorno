#!/usr/bin/env node
// Server locale zero-dipendenze: serve il sito e le app, espone le API per richieste, idee,
// generazione manuale (lancia `claude -p` in questa cartella) e frequenza della routine cloud.
//   GET  /api/status            → { local, remote, generating }
//   GET  /api/richieste         → { open: [...], done: [...] }
//   POST /api/richieste         → { text, idea? } → append in richieste.md (+ rimuove la riga da idee.md) + commit + push
//   POST /api/pull              → git pull --ff-only
//   GET  /api/config            → { frequenza, presets, routine_id }
//   POST /api/frequenza         → { preset } → aggiorna la routine cloud via `claude -p` + salva config.json
//   POST /api/genera            → { text?, idea?, queued? } → mette il brief (o la riga già in coda `queued`) in cima e lancia `claude -p` (Opus)
//   GET  /api/genera/stato      → { running, startedAt, finishedAt, ok, log: [...] }
// All'avvio fa un git pull (non blocca se offline). Porta: env PORT o 8787.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8787;
const RICHIESTE = join(ROOT, "richieste.md");
const IDEE = join(ROOT, "idee.md");
const CONFIG = join(ROOT, "config.json");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

// Preset di frequenza della routine cloud (cron in UTC; 6 UTC = 8:00 ora italiana in estate).
const PRESETS = {
  "pausa":        { label: "In pausa",                 cron: null,            enabled: false },
  "1-al-giorno":  { label: "1 al giorno (8:00)",       cron: "0 6 * * *",     enabled: true },
  "2-al-giorno":  { label: "2 al giorno (8:00, 20:00)", cron: "0 6,18 * * *", enabled: true },
  "3-al-giorno":  { label: "3 al giorno (8, 14, 20)",  cron: "0 6,12,18 * * *", enabled: true },
  "ogni-5-ore":   { label: "Ogni 5 ore",               cron: "0 */5 * * *",   enabled: true },
  "ogni-3-ore":   { label: "Ogni 3 ore",               cron: "0 */3 * * *",   enabled: true },
};

// ---- git -------------------------------------------------------------------
function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 }).trim();
}
function hasRemote() {
  try { git("remote", "get-url", "origin"); return true; } catch { return false; }
}
function pull() {
  if (gen.running) return { ok: false, message: "generazione in corso: riprova tra poco" };
  if (!hasRemote()) return { ok: false, message: "nessun remote configurato" };
  try { return { ok: true, message: git("pull", "--ff-only", "origin", "main") }; }
  catch (e) { return { ok: false, message: (e.stderr || e.message).toString().trim() }; }
}
// Commit (e push se c'è un remote) dei file indicati; ritorna un messaggio leggibile.
function commitAndPush(files, message) {
  const result = { committed: false, pushed: false, message: "" };
  try {
    git("add", ...files);
    git("commit", "-m", message);
    result.committed = true;
  } catch (e) { result.message = "salvato, ma commit fallito: " + (e.stderr || e.message).toString().trim(); return result; }
  if (!hasRemote()) { result.message = "salvato e committato (nessun remote: push saltato)"; return result; }
  try { git("push", "origin", "main"); result.pushed = true; result.message = "salvato e inviato su GitHub"; }
  catch (e) { result.message = "salvato e committato, ma push fallito (riprova con Aggiorna o `git push`): " + (e.stderr || e.message).toString().trim().split("\n").pop(); }
  return result;
}

// ---- richieste e idee --------------------------------------------------------
function parseRichieste() {
  if (!existsSync(RICHIESTE)) return { open: [], done: [] };
  const open = [], done = [];
  for (const line of readFileSync(RICHIESTE, "utf8").split("\n")) {
    let m = line.match(/^- \[ \] (.+)$/);
    if (m) { open.push({ text: m[1].trim() }); continue; }
    m = line.match(/^- \[x\] (.+?)(?:\s*→\s*(.+))?$/i);
    if (m) done.push({ text: m[1].trim(), result: m[2]?.trim() ?? null });
  }
  return { open, done };
}
function cleanText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length < 3 || clean.length > 500) throw new Error("la richiesta deve avere tra 3 e 500 caratteri");
  return clean;
}
// Rimuove da idee.md la riga approvata; ritorna true se l'ha trovata.
function removeIdea(line) {
  if (!existsSync(IDEE)) return false;
  const lines = readFileSync(IDEE, "utf8").split("\n");
  const i = lines.findIndex(l => l.trim() === `- [ ] ${line}`.trim());
  if (i < 0) return false;
  lines.splice(i, 1);
  writeFileSync(IDEE, lines.join("\n"));
  return true;
}
// Aggiunge una richiesta: in fondo alla coda, oppure in cima (subito dopo "## Coda") se `first`.
function appendRichiesta(clean, first) {
  const content = existsSync(RICHIESTE) ? readFileSync(RICHIESTE, "utf8") : "# Richieste\n\n## Coda\n";
  const entry = `- [ ] ${clean}`;
  if (first) {
    const lines = content.split("\n");
    let i = lines.findIndex(l => /^## Coda/.test(l));
    if (i < 0) { writeFileSync(RICHIESTE, content + (content.endsWith("\n") ? "" : "\n") + entry + "\n"); return; }
    i++;
    while (i < lines.length && lines[i].trim() === "") i++;
    lines.splice(i, 0, entry);
    writeFileSync(RICHIESTE, lines.join("\n"));
    return;
  }
  appendFileSync(RICHIESTE, (content.endsWith("\n") ? "" : "\n") + entry + "\n");
}
// Sposta in cima alla coda una richiesta già presente; ritorna false se non la trova.
function moveRequestToTop(line) {
  if (!existsSync(RICHIESTE)) return false;
  const lines = readFileSync(RICHIESTE, "utf8").split("\n");
  const i = lines.findIndex(l => l.trim() === `- [ ] ${line}`.trim());
  if (i < 0) return false;
  const [entry] = lines.splice(i, 1);
  let j = lines.findIndex(l => /^## Coda/.test(l));
  if (j < 0) { lines.unshift(entry); } else {
    j++;
    while (j < lines.length && lines[j].trim() === "") j++;
    lines.splice(j, 0, entry);
  }
  writeFileSync(RICHIESTE, lines.join("\n"));
  return true;
}
function addRichiesta(text, idea, first) {
  const clean = cleanText(text);
  appendRichiesta(clean, first);
  const ideaRemoved = idea ? removeIdea(idea) : false;
  const files = ideaRemoved ? ["richieste.md", "idee.md"] : ["richieste.md"];
  return { saved: true, ...commitAndPush(files, `${ideaRemoved ? "idea approvata" : "richiesta"}: ${clean.slice(0, 60)}`) };
}

// ---- config / frequenza ------------------------------------------------------
function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG, "utf8")); } catch { return { routine_id: null, frequenza: "2-al-giorno" }; }
}
function writeConfig(cfg) { writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n"); }

// Esegue `claude -p` e raccoglie l'output; risolve { code, out }.
function runClaude(prompt, args, onLine) {
  return new Promise((resolveRun) => {
    const child = spawn("claude", ["-p", ...args], { cwd: ROOT, shell: true, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, CLAUDECODE: "" } });
    let out = "", buf = "";
    const feed = (chunk) => {
      out += chunk; buf += chunk;
      const lines = buf.split("\n"); buf = lines.pop();
      for (const l of lines) if (l.trim()) onLine?.(l);
    };
    child.stdout.on("data", d => feed(d.toString()));
    child.stderr.on("data", d => feed(d.toString()));
    child.on("error", e => { onLine?.("errore avvio claude: " + e.message); resolveRun({ code: -1, out: out + e.message }); });
    child.on("close", code => { if (buf.trim()) onLine?.(buf); resolveRun({ code, out }); });
    child.stdin.end(prompt);
  });
}

async function setFrequenza(preset) {
  const p = PRESETS[preset];
  if (!p) throw new Error("preset sconosciuto");
  const cfg = readConfig();
  if (!cfg.routine_id) throw new Error("config.json senza routine_id");
  const body = p.cron ? { cron_expression: p.cron, enabled: true } : { enabled: false };
  const prompt = `Usa lo strumento RemoteTrigger con action "update", trigger_id "${cfg.routine_id}" e body ${JSON.stringify(body)}. ` +
    `Poi rispondi SOLO con la riga: OK cron=<cron_expression della risposta> enabled=<enabled della risposta>. Se fallisce rispondi: ERRORE <motivo>.`;
  const { code, out } = await runClaude(prompt, ["--model", "sonnet", "--allowedTools", "RemoteTrigger", "--max-turns", "3"]);
  const line = out.trim().split("\n").pop() || "";
  if (code !== 0 || !/^OK\b/.test(line)) throw new Error("aggiornamento routine fallito: " + (line || `exit ${code}`).slice(0, 200));
  cfg.frequenza = preset;
  writeConfig(cfg);
  commitAndPush(["config.json"], `frequenza: ${p.label}`);
  return { ok: true, message: `Routine aggiornata: ${p.label}`, detail: line };
}

// ---- generazione manuale -------------------------------------------------------
const gen = { running: false, startedAt: null, finishedAt: null, ok: null, log: [], brief: null };
function logLine(text) {
  gen.log.push(`[${new Date().toLocaleTimeString("it-IT")}] ${text}`);
  if (gen.log.length > 200) gen.log.shift();
}
// Trasforma una riga stream-json di claude in una riga di log leggibile (o null se non interessante).
function describeEvent(line) {
  let ev; try { ev = JSON.parse(line); } catch { return line.slice(0, 200); }
  if (ev.type === "assistant") {
    for (const c of ev.message?.content || []) {
      if (c.type === "tool_use") {
        const inp = c.input || {};
        const what = inp.command || inp.file_path || inp.pattern || inp.description || "";
        return `${c.name}: ${String(what).slice(0, 140)}`;
      }
      if (c.type === "text" && c.text?.trim()) return c.text.trim().slice(0, 300);
    }
  }
  if (ev.type === "result") return ev.is_error ? `ERRORE: ${(ev.result || "").slice(0, 300)}` : `Fine: ${(ev.result || "").slice(0, 300)}`;
  return null;
}
async function startGeneration(text, idea, queued) {
  if (gen.running) throw new Error("c'è già una generazione in corso");
  let brief = null;
  if (queued) {
    if (!moveRequestToTop(queued)) throw new Error("richiesta non trovata in coda (forse è già stata fatta)");
    brief = queued;
  } else if (text) {
    brief = cleanText(text);
    appendRichiesta(brief, true);
    if (idea) removeIdea(idea);
  }
  Object.assign(gen, { running: true, startedAt: new Date().toISOString(), finishedAt: null, ok: null, log: [], brief });
  logLine(brief ? `Brief: ${brief}` : "Nessun brief: l'agente sceglie dalla coda o dalle idee");
  logLine("Avvio claude (Opus) in " + ROOT);
  const prompt = `Sei nel repository app-al-giorno (branch main). Esecuzione MANUALE avviata dall'utente dal sito locale: ` +
    `esegui la PROCEDURA GENERAZIONE di CLAUDE.md per intero, esattamente come farebbe la routine cloud. ` +
    (brief ? `La prima riga aperta di richieste.md è il brief appena scelto dall'utente: usa quella. ` : "") +
    `Leggi CLAUDE.md e preferenze.md. Fai la RICERCA DI MERCATO (MERCATO: WebSearch per verificare la keyword, WebFetch sui concorrenti) e definisci il blocco business prima del codice; ` +
    `rispetta SEO e MONETIZZAZIONE (guida >=350 parole, segnaposto data-ad/data-support, funzione Pro implementata; riferimento apps/2026-09-17-dividi-il-conto), DESIGN e MOBILE (design diverso dalle app precedenti, progettata prima per telefono), ` +
    `lancia node tools/check.mjs e node tools/build.mjs finché passano, marca la richiesta, mantieni 5 idee in idee.md, ` +
    `poi git add -A, commit e git push origin main. Qualità prima della velocità. Alla fine riporta in una riga titolo, cartella, design e hash del commit.`;
  const args = ["--model", "opus", "--allowedTools", "Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebSearch", "WebFetch", "--permission-mode", "acceptEdits", "--output-format", "stream-json", "--verbose"];
  runClaude(prompt, args, (l) => { const d = describeEvent(l); if (d) logLine(d); }).then(({ code }) => {
    gen.running = false; gen.finishedAt = new Date().toISOString(); gen.ok = code === 0;
    logLine(code === 0 ? "Generazione completata" : `claude terminato con codice ${code}`);
  });
}

// ---- http ------------------------------------------------------------------
function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 10_000) { reject(new Error("body troppo grande")); req.destroy(); } });
    req.on("end", () => resolveBody(data));
    req.on("error", reject);
  });
}
async function readJson(req) {
  try { return JSON.parse(await readBody(req) || "{}"); } catch { throw new Error("JSON non valido"); }
}
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) { res.writeHead(403); return res.end("403"); }
  if (rel.startsWith("/.git")) { res.writeHead(403); return res.end("403"); }
  if (!existsSync(filePath)) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("404 – non trovato: " + rel); }
  if (statSync(filePath).isDirectory()) { res.writeHead(301, { Location: pathname + "/" }); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname, m = req.method;
  try {
    if (path === "/api/status" && m === "GET") return json(res, 200, { local: true, remote: hasRemote(), generating: gen.running });
    if (path === "/api/richieste" && m === "GET") return json(res, 200, parseRichieste());
    if (path === "/api/richieste" && m === "POST") {
      const body = await readJson(req);
      if (typeof body.text !== "string") return json(res, 400, { error: "campo 'text' mancante" });
      const r = addRichiesta(body.text, typeof body.idea === "string" ? body.idea : null, false);
      return json(res, r.pushed ? 201 : 202, r);
    }
    if (path === "/api/pull" && m === "POST") return json(res, 200, pull());
    if (path === "/api/config" && m === "GET") {
      const cfg = readConfig();
      return json(res, 200, { ...cfg, presets: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.label])) });
    }
    if (path === "/api/frequenza" && m === "POST") {
      const body = await readJson(req);
      return json(res, 200, await setFrequenza(String(body.preset || "")));
    }
    if (path === "/api/genera" && m === "POST") {
      const body = await readJson(req);
      if (gen.running) return json(res, 409, { error: "generazione già in corso" });
      await startGeneration(typeof body.text === "string" && body.text.trim() ? body.text : null, typeof body.idea === "string" ? body.idea : null, typeof body.queued === "string" && body.queued.trim() ? body.queued.trim() : null);
      return json(res, 202, { ok: true, message: "Generazione avviata" });
    }
    if (path === "/api/genera/stato" && m === "GET") return json(res, 200, gen);
    if (path.startsWith("/api/")) return json(res, 404, { error: "endpoint sconosciuto" });
    if (m !== "GET" && m !== "HEAD") { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, path);
  } catch (e) {
    console.error(e);
    return json(res, 400, { error: e.message });
  }
});

const p = pull();
console.log(p.ok ? `git pull: ${p.message}` : `git pull saltato: ${p.message}`);
// HOST=127.0.0.1 per limitare l'accesso al solo PC; di default ascolta anche sulla rete locale (telefono in casa).
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Un'App al Giorno → pannello http://localhost:${PORT}/admin.html · sito pubblico http://localhost:${PORT}/  (Ctrl+C per chiudere)`);
  if (HOST === "0.0.0.0") {
    const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
    for (const ip of ips) console.log(`  dal telefono (stessa Wi-Fi): http://${ip}:${PORT}`);
  }
});
