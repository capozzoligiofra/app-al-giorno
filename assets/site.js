// Sito vetrina: legge il catalogo (window.__APPS__ generato da tools/build.mjs, con fetch
// di apps.json come aggiornamento quando c'è un server), renderizza le card con ricerca e
// filtri, e gestisce la sezione Richieste tramite le API di tools/serve.mjs (se presenti).
(() => {
  "use strict";

  const CATEGORY_LABELS = {
    "produttivita": "Produttività",
    "salute-benessere": "Salute e benessere",
    "finanza-personale": "Finanza personale",
    "studio-apprendimento": "Studio",
    "casa-cucina": "Casa e cucina",
    "creativita": "Creatività",
    "utility-sviluppatori": "Sviluppatori",
    "giochi-educativi": "Giochi educativi",
    "calcolatori-convertitori": "Calcolatori",
    "testo-scrittura": "Testo e scrittura",
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const c of children.flat()) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return node;
  };
  const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  };

  const state = { catalog: null, query: "", category: null, api: false };

  // ---- catalogo ----------------------------------------------------------
  function renderStats() {
    const { apps, count } = state.catalog;
    const s = $("#stats");
    if (!count) { s.textContent = "Il catalogo è ancora vuoto: la prima app arriva a breve."; return; }
    s.textContent = `${count} app finora, l'ultima il ${fmtDate(apps[0].date)}.`;
  }

  function renderCategories() {
    const counts = {};
    for (const a of state.catalog.apps) counts[a.category] = (counts[a.category] || 0) + 1;
    const box = $("#categories");
    box.replaceChildren();
    box.append(el("button", { class: "chip", type: "button", "aria-pressed": String(state.category === null), onclick: () => setCategory(null) }, "Tutte"));
    for (const c of state.catalog.categories) {
      if (!counts[c]) continue;
      box.append(el("button", {
        class: "chip", type: "button", "aria-pressed": String(state.category === c),
        onclick: () => setCategory(state.category === c ? null : c),
      }, `${CATEGORY_LABELS[c] || c} · ${counts[c]}`));
    }
  }

  function setCategory(c) { state.category = c; renderCategories(); renderGrid(); }

  function matches(app) {
    if (state.category && app.category !== state.category) return false;
    if (!state.query) return true;
    const hay = [app.title, app.description, app.tags.join(" "), CATEGORY_LABELS[app.category] || app.category, app.request || ""].join(" ").toLowerCase();
    return state.query.split(/\s+/).every(w => hay.includes(w));
  }

  function card(app) {
    const href = `apps/${app.slug}/index.html`;
    const repo = state.catalog.repo;
    const badges = [el("span", { class: "badge cat" }, CATEGORY_LABELS[app.category] || app.category)];
    if (app.source === "richiesta") badges.push(el("span", { class: "badge req", title: app.request || "" }, "su richiesta"));
    if (app.status === "bozza") badges.push(el("span", { class: "badge draft" }, "bozza"));
    for (const t of app.tags) badges.push(el("span", { class: "badge" }, t));
    const actions = [el("a", { class: "btn", href, target: "_blank", rel: "noopener" }, "Apri")];
    if (repo) actions.push(el("a", { class: "btn btn-ghost", href: `${repo}/blob/main/apps/${app.slug}/index.html`, target: "_blank", rel: "noopener" }, "Codice"));
    return el("article", { class: "card" },
      el("div", { class: "card-head" },
        el("h3", {}, el("a", { href, target: "_blank", rel: "noopener" }, app.title)),
        el("time", { class: "card-date", datetime: app.date }, fmtDate(app.date))),
      el("p", {}, app.description),
      el("div", { class: "badges" }, badges),
      el("div", { class: "card-actions" }, actions));
  }

  function renderGrid() {
    const grid = $("#grid");
    const list = state.catalog.apps.filter(matches);
    const emptyText = state.catalog.count
      ? "Nessuna app corrisponde alla ricerca."
      : "Nessuna app ancora. La prima verrà creata alla prossima esecuzione dell'agente.";
    grid.replaceChildren(...(list.length ? list.map(card) : [el("p", { class: "empty" }, emptyText)]));
  }

  function loadCatalog(catalog) {
    state.catalog = catalog;
    const repoLink = $("#repo-link");
    if (catalog.repo) {
      repoLink.href = catalog.repo;
      repoLink.hidden = false;
      $("#richieste-link").href = `${catalog.repo}/edit/main/richieste.md`;
    }
    renderStats(); renderCategories(); renderGrid();
  }

  async function refreshCatalog() {
    try {
      const r = await fetch("apps.json", { cache: "no-store" });
      if (r.ok) loadCatalog(await r.json());
    } catch (_) { /* file:// o server assente: resta window.__APPS__ */ }
  }

  // ---- richieste ---------------------------------------------------------
  function renderRequests({ open, done }) {
    const openList = $("#open-list"), doneList = $("#done-list");
    $("#open-count").textContent = open.length ? `(${open.length})` : "";
    $("#done-count").textContent = done.length ? `(${done.length})` : "";
    openList.replaceChildren(...(open.length
      ? open.map(r => el("li", {}, r.text))
      : [el("li", { class: "none" }, "Nessuna richiesta in coda: l'agente inventerà da sé.")]));
    doneList.replaceChildren(...(done.length
      ? done.slice().reverse().map(r => {
          const li = el("li", { class: "done" }, r.text);
          if (r.result && r.result.startsWith("apps/")) li.append(" — ", el("a", { href: `${r.result}/index.html`, target: "_blank", rel: "noopener" }, "apri"));
          else if (r.result) li.append(" — ", r.result);
          return li;
        })
      : [el("li", { class: "none" }, "Ancora nessuna.")]));
  }

  // Senza server (GitHub Pages, o file:// dove il browser lo consente): richieste.md letto direttamente.
  function parseRichiesteMd(text) {
    const open = [], done = [];
    for (const line of text.split("\n")) {
      let m = line.match(/^- \[ \] (.+)$/);
      if (m) { open.push({ text: m[1].trim() }); continue; }
      m = line.match(/^- \[x\] (.+?)(?:\s*→\s*(.+))?$/i);
      if (m) done.push({ text: m[1].trim(), result: m[2] ? m[2].trim() : null });
    }
    return { open, done };
  }

  async function loadRequests() {
    if (state.api) {
      try {
        const r = await fetch("api/richieste", { cache: "no-store" });
        if (r.ok) { renderRequests(await r.json()); return; }
      } catch (_) { /* server sparito: passa al fallback */ }
    }
    try {
      const r = await fetch("richieste.md", { cache: "no-store" });
      if (r.ok) { renderRequests(parseRichiesteMd(await r.text())); return; }
    } catch (_) { /* non raggiungibile */ }
    renderRequests({ open: [], done: [] });
  }

  function showMsg(node, text, kind) {
    node.textContent = text;
    node.className = "msg " + (kind || "");
    node.hidden = !text;
  }

  async function submitRequest(ev) {
    ev.preventDefault();
    const ta = $("#request-text"), btn = ev.target.querySelector("button"), msg = $("#request-msg");
    const text = ta.value.trim();
    if (text.length < 3) { showMsg(msg, "Scrivi almeno qualche parola.", "warn"); return; }
    btn.disabled = true; showMsg(msg, "Invio…");
    try {
      const r = await fetch("api/richieste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      showMsg(msg, data.message, data.pushed ? "ok" : "warn");
      ta.value = "";
      $("#request-count").textContent = "0 / 500";
      loadRequests();
    } catch (e) {
      showMsg(msg, "Errore: " + e.message, "warn");
    } finally { btn.disabled = false; }
  }

  async function pull() {
    const btn = $("#refresh"), msg = $("#catalog-msg");
    btn.disabled = true; showMsg(msg, "Aggiornamento in corso…");
    try {
      const r = await fetch("api/pull", { method: "POST" });
      const data = await r.json();
      showMsg(msg, data.message, data.ok ? "ok" : "warn");
      await refreshCatalog();
      await loadRequests();
    } catch (e) {
      showMsg(msg, "Errore: " + e.message, "warn");
    } finally {
      btn.disabled = false;
      setTimeout(() => showMsg(msg, ""), 6000);
    }
  }

  async function detectApi() {
    try {
      const r = await fetch("api/status", { cache: "no-store" });
      if (r.ok) return !!(await r.json()).local;
    } catch (_) { /* nessuna API */ }
    return false;
  }

  // ---- avvio -------------------------------------------------------------
  async function init() {
    loadCatalog(window.__APPS__ || { apps: [], count: 0, categories: [], repo: null });
    $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderGrid(); });
    $("#request-text").addEventListener("input", (e) => { $("#request-count").textContent = `${e.target.value.length} / 500`; });
    $("#request-form").addEventListener("submit", submitRequest);
    $("#refresh").addEventListener("click", pull);

    state.api = await detectApi();
    $("#request-form").hidden = !state.api;
    $("#request-offline").hidden = state.api;
    $("#refresh").hidden = !state.api;
    await Promise.all([refreshCatalog(), loadRequests()]);
  }

  init();
})();
