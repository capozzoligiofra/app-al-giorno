#!/usr/bin/env node
// Server locale zero-dipendenze: serve il sito e le app, espone le API per le richieste.
//   GET  /api/richieste      → { open: [...], done: [...] }
//   POST /api/richieste      → { text, idea? } → append in richieste.md (+ rimuove la riga da idee.md) + commit + push
//   POST /api/pull           → git pull --ff-only
// All'avvio fa un git pull (non blocca se offline). Porta: env PORT o 8787.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8787;
const RICHIESTE = join(ROOT, "richieste.md");
const IDEE = join(ROOT, "idee.md");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 }).trim();
}

function hasRemote() {
  try { git("remote", "get-url", "origin"); return true; } catch { return false; }
}

function pull() {
  if (!hasRemote()) return { ok: false, message: "nessun remote configurato" };
  try { return { ok: true, message: git("pull", "--ff-only", "origin", "main") }; }
  catch (e) { return { ok: false, message: (e.stderr || e.message).toString().trim() }; }
}

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

function addRichiesta(text, idea) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 3 || clean.length > 500) throw new Error("la richiesta deve avere tra 3 e 500 caratteri");
  const content = existsSync(RICHIESTE) ? readFileSync(RICHIESTE, "utf8") : "# Richieste\n\n## Coda\n";
  appendFileSync(RICHIESTE, (content.endsWith("\n") ? "" : "\n") + `- [ ] ${clean}\n`);
  const ideaRemoved = idea ? removeIdea(idea) : false;
  const result = { saved: true, committed: false, pushed: false, message: "" };
  try {
    git("add", "richieste.md");
    if (ideaRemoved) git("add", "idee.md");
    git("commit", "-m", `${ideaRemoved ? "idea approvata" : "richiesta"}: ${clean.slice(0, 60)}`);
    result.committed = true;
  } catch (e) { result.message = "salvata, ma commit fallito: " + (e.stderr || e.message).toString().trim(); return result; }
  if (!hasRemote()) { result.message = "salvata e committata (nessun remote: push saltato)"; return result; }
  try { git("push", "origin", "main"); result.pushed = true; result.message = "salvata e inviata su GitHub"; }
  catch (e) { result.message = "salvata e committata, ma push fallito (riprova con Aggiorna o `git push`): " + (e.stderr || e.message).toString().trim().split("\n").pop(); }
  return result;
}

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
  try {
    if (url.pathname === "/api/richieste" && req.method === "GET") return json(res, 200, parseRichieste());
    if (url.pathname === "/api/richieste" && req.method === "POST") {
      let body;
      try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { error: "JSON non valido" }); }
      if (typeof body.text !== "string") return json(res, 400, { error: "campo 'text' mancante" });
      try { const r = addRichiesta(body.text, typeof body.idea === "string" ? body.idea : null); return json(res, r.pushed ? 201 : 202, r); }
      catch (e) { return json(res, 400, { error: e.message }); }
    }
    if (url.pathname === "/api/pull" && req.method === "POST") return json(res, 200, pull());
    if (url.pathname === "/api/status" && req.method === "GET") return json(res, 200, { local: true, remote: hasRemote() });
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "endpoint sconosciuto" });
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message });
  }
});

const p = pull();
console.log(p.ok ? `git pull: ${p.message}` : `git pull saltato: ${p.message}`);
server.listen(PORT, "127.0.0.1", () => console.log(`Un'App al Giorno → http://localhost:${PORT}  (Ctrl+C per chiudere)`));
