// Sito vetrina: legge il catalogo (window.__APPS__ generato da tools/build.mjs, aggiornato via
// fetch di apps.json quando c'è un server), renderizza le schede con ricerca e filtri, mostra le
// idee proposte dall'agente (idee.md) e gestisce le richieste tramite le API di tools/serve.mjs.
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
    return new Date(y, m - 1, d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const state = { catalog: null, query: "", category: null, api: false };

  // ---- catalogo ----------------------------------------------------------
  // La routine cloud gira alle 6:00 e alle 18:00 UTC (cron "0 6,18 * * *", il minuto può variare).
  function nextRun() {
    const now = new Date();
    for (let h = 0; h <= 48; h++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0));
      if ((d.getUTCHours() === 6 || d.getUTCHours() === 18) && d > now) return d;
    }
    return null;
  }

  function renderStats() {
    const { apps, count } = state.catalog;
    const next = nextRun();
    const when = next ? next.toLocaleString("it-IT", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    $("#stats").textContent = count
      ? `${count} app · ultima ${fmtDate(apps[0].date)} · prossima ${when}`
      : `Nessuna app ancora · prossima ${when}`;
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
    const d = app.design || {};
    const badges = [el("span", { class: "badge cat" }, CATEGORY_LABELS[app.category] || app.category)];
    if (app.source === "richiesta") badges.push(el("span", { class: "badge req", title: app.request || "" }, "su richiesta"));
    if (app.status === "bozza") badges.push(el("span", { class: "badge draft" }, "bozza"));
    if (app.version > 1) badges.push(el("span", { class: "badge", title: (app.changelog || []).join("\n") }, `v${app.version}`));
    if (d.layout) badges.push(el("span", { class: "badge design", title: `layout ${d.layout} · palette ${d.palette} · font ${d.font}` }, `${d.layout} · ${d.palette}`));
    for (const t of app.tags) badges.push(el("span", { class: "badge" }, t));

    const actions = [el("a", { class: "btn btn-accent", href, target: "_blank", rel: "noopener" }, "Apri")];
    actions.push(el("button", { class: "btn btn-ghost", type: "button", title: "Chiedi una modifica a questa app", onclick: () => improve(app) }, "Migliora"));
    if (repo) actions.push(el("a", { class: "btn btn-ghost", href: `${repo}/blob/main/apps/${app.slug}/index.html`, target: "_blank", rel: "noopener", title: "Codice sorgente" }, "</>"));

    return el("article", { class: `card p-${d.palette || "none"}` },
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

  // "Migliora": precompila la richiesta con il prefisso che l'agente riconosce.
  function improve(app) {
    const ta = $("#request-text");
    if (!state.api) { location.hash = "#richieste"; return; }
    ta.value = `migliora apps/${app.slug}: `;
    $("#request-count").textContent = `${ta.value.length} / 500`;
    location.hash = "#richieste";
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  // ---- idee --------------------------------------------------------------
  function parseIdeeMd(text) {
    const out = [];
    for (const line of text.split("\n")) {
      const m = line.match(/^- \[ \] (.+)$/);
      if (!m) continue;
      const [title, ...rest] = m[1].split(" — ");
      out.push({ line: m[1].trim(), title: title.trim(), text: rest.join(" — ").trim() });
    }
    return out;
  }

  function renderIdeas(ideas) {
    const ul = $("#ideas");
    if (!ideas.length) { ul.replaceChildren(el("li", { class: "none" }, "Nessuna idea in attesa: l'agente ne proporrà di nuove alla prossima esecuzione.")); return; }
    ul.replaceChildren(...ideas.map(i => el("li", {},
      el("div", { class: "txt" }, el("b", {}, i.title), i.text ? el("span", {}, i.text) : ""),
      state.api ? el("button", { class: "btn", type: "button", onclick: (ev) => approveIdea(i, ev.target) }, "Approva") : "")));
  }

  async function loadIdeas() {
    try {
      const r = await fetch("idee.md", { cache: "no-store" });
      if (r.ok) { renderIdeas(parseIdeeMd(await r.text())); return; }
    } catch (_) { /* non raggiungibile */ }
    renderIdeas([]);
  }

  async function approveIdea(idea, btn) {
    btn.disabled = true;
    try {
      const r = await fetch("api/richieste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: idea.line, idea: idea.line }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      showMsg($("#request-msg"), `Idea approvata: ${data.message}`, data.pushed ? "ok" : "warn");
      await Promise.all([loadIdeas(), loadRequests()]);
    } catch (e) {
      showMsg($("#request-msg"), "Errore: " + e.message, "warn");
      btn.disabled = false;
    }
  }

  // ---- richieste ---------------------------------------------------------
  function renderRequests({ open, done }) {
    $("#open-count").textContent = open.length ? `(${open.length})` : "";
    $("#done-count").textContent = done.length ? `(${done.length})` : "";
    $("#open-list").replaceChildren(...(open.length
      ? open.map(r => el("li", {}, r.text))
      : [el("li", { class: "none" }, "Nessuna richiesta in coda: l'agente sceglierà un'idea da solo.")]));
    $("#done-list").replaceChildren(...(done.length
      ? done.slice().reverse().map(r => {
          const li = el("li", { class: "done" }, r.text);
          const m = r.result && r.result.match(/^(apps\/[a-z0-9-]+)/);
          if (m) li.append(" — ", el("a", { href: `${m[1]}/index.html`, target: "_blank", rel: "noopener" }, "apri"));
          else if (r.result) li.append(" — ", r.result);
          return li;
        })
      : [el("li", { class: "none" }, "Ancora nessuna.")]));
  }

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
    const ta = $("#request-text"), btn = ev.target.querySelector("button[type=submit]"), msg = $("#request-msg");
    const text = ta.value.trim();
    if (text.length < 3) { showMsg(msg, "Scrivi almeno qualche parola.", "warn"); return; }
    if (/^migliora apps\/[a-z0-9-]+:\s*$/i.test(text)) { showMsg(msg, "Scrivi cosa vuoi migliorare dopo i due punti.", "warn"); return; }
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
      await Promise.all([refreshCatalog(), loadRequests(), loadIdeas()]);
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
    await Promise.all([refreshCatalog(), loadRequests(), loadIdeas()]);
  }

  init();
})();
