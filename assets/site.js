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
  function renderStats() {
    const { apps, count } = state.catalog;
    $("#stats").textContent = count ? `${count} app · ultima ${fmtDate(apps[0].date)}` : "Nessuna app ancora";
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
    const hay = [app.title, app.description, app.tags.join(" "), CATEGORY_LABELS[app.category] || app.category, app.request || "", app.business?.keyword || "", (app.business?.keywords || []).join(" ")].join(" ").toLowerCase();
    return state.query.split(/\s+/).every(w => hay.includes(w));
  }

  function card(app) {
    const href = `apps/${app.slug}/index.html`;
    const repo = state.catalog.repo;
    const d = app.design || {};
    const badges = [el("span", { class: "badge cat" }, CATEGORY_LABELS[app.category] || app.category)];
    if (app.source === "richiesta") badges.push(el("span", { class: "badge req", title: app.request || "" }, "su richiesta"));
    if (app.status === "bozza") badges.push(el("span", { class: "badge draft" }, "bozza"));
    if (app.business?.keyword) badges.push(el("span", { class: "badge kw", title: "Ricerca a cui risponde" }, `🔎 ${app.business.keyword}`));
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
    }
    renderStats(); renderCategories(); renderGrid();
  }

  async function refreshCatalog() {
    try {
      const r = await fetch("apps.json", { cache: "no-store" });
      if (r.ok) loadCatalog(await r.json());
    } catch (_) { /* file:// o server assente: resta window.__APPS__ */ }
  }

  // Modalità senza server (GitHub Pages / file://): copia la riga pronta e apre l'editor di richieste.md su GitHub.
  async function copyAndOpenGitHub(text, msgNode) {
    const line = `- [ ] ${text}`;
    let copied = false;
    try { await navigator.clipboard.writeText(line); copied = true; } catch (_) { /* clipboard non disponibile */ }
    const repo = state.catalog.repo;
    if (!repo) { showMsg(msgNode, "Riga da aggiungere a richieste.md: " + line, "warn"); return; }
    showMsg(msgNode, copied ? "Riga copiata. Nell'editor GitHub incollala in fondo al file e premi Commit changes." : "Copia questa riga e incollala in fondo al file: " + line, copied ? "ok" : "warn");
    window.open(`${repo}/edit/main/richieste.md`, "_blank", "noopener");
  }

  // "Migliora": precompila la richiesta con il prefisso che l'agente riconosce.
  function improve(app) {
    const ta = $("#request-text");
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
      state.api ? el("div", { class: "acts" },
        el("button", { class: "btn btn-accent", type: "button", onclick: (ev) => generateNow(i.line, i.line, ev.target) }, "Genera ora"),
        el("button", { class: "btn btn-ghost", type: "button", onclick: (ev) => approveIdea(i, ev.target) }, "Approva"))
      : el("div", { class: "acts" },
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => copyAndOpenGitHub(i.line, $("#request-msg")) }, "Approva su GitHub")))));
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

  // ---- generazione manuale (claude -p sul PC) --------------------------------
  let genTimer = null;
  async function generateNow(text, idea, btn) {
    if (btn) btn.disabled = true;
    try {
      const r = await fetch("api/genera", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, idea }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      showGenPanel(true);
      location.hash = "#catalogo";
      pollGen();
      await loadIdeas();
    } catch (e) {
      showMsg($("#request-msg"), "Errore: " + e.message, "warn");
      if (btn) btn.disabled = false;
    }
  }

  function showGenPanel(on) {
    $("#gen-panel").hidden = !on;
  }

  async function pollGen() {
    clearTimeout(genTimer);
    let st;
    try { st = await (await fetch("api/genera/stato", { cache: "no-store" })).json(); }
    catch (_) { return; }
    if (!st.startedAt) return;
    const panel = $("#gen-panel");
    panel.hidden = false;
    panel.classList.toggle("running", st.running);
    $("#gen-title").textContent = st.running ? "Generazione in corso sul tuo PC…" : (st.ok ? "Generazione completata" : "Generazione terminata con errori");
    $("#gen-brief").textContent = st.brief ? `Brief: ${st.brief}` : "Brief: dalla coda o dalle idee";
    const log = $("#gen-log");
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.textContent = st.log.join("\n");
    if (atBottom) log.scrollTop = log.scrollHeight;
    $("#gen-close").hidden = st.running;
    if (st.running) genTimer = setTimeout(pollGen, 3000);
    else if (st.finishedAt && st.finishedAt !== state.lastGenSeen) {
      state.lastGenSeen = st.finishedAt;
      await Promise.all([refreshCatalog(), loadRequests(), loadIdeas()]);
    }
  }

  // ---- frequenza della routine cloud ------------------------------------------
  async function loadConfig() {
    if (!state.api) {
      try {
        const cfg = await (await fetch("config.json", { cache: "no-store" })).json();
        if (cfg.routine_id) {
          $("#routine-link").href = `https://claude.ai/code/routines/${cfg.routine_id}`;
          $("#auto-hint").textContent = `Frequenza attuale: ${cfg.frequenza}. Da qui puoi cambiare l'orario o lanciare "Esegui ora" (prende la prima richiesta in coda).`;
        }
      } catch (_) { /* config assente */ }
      return;
    }
    try {
      const cfg = await (await fetch("api/config", { cache: "no-store" })).json();
      const sel = $("#freq");
      sel.replaceChildren(...Object.entries(cfg.presets).map(([k, label]) => new Option(label, k)));
      sel.value = cfg.frequenza;
      state.frequenza = cfg.frequenza;
      if (!cfg.routine_id) { $("#auto-hint").textContent = "Nessuna routine cloud configurata (config.json)."; $("#freq-save").disabled = true; }
    } catch (_) { /* senza server */ }
  }

  async function saveFrequenza() {
    const sel = $("#freq"), btn = $("#freq-save"), msg = $("#freq-msg");
    if (sel.value === state.frequenza) { showMsg(msg, "È già così.", ""); return; }
    btn.disabled = true; showMsg(msg, "Aggiorno la routine cloud (qualche secondo)…");
    try {
      const r = await fetch("api/frequenza", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset: sel.value }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      state.frequenza = sel.value;
      showMsg(msg, data.message, "ok");
    } catch (e) {
      showMsg(msg, "Errore: " + e.message, "warn");
      sel.value = state.frequenza;
    } finally { btn.disabled = false; }
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
    if (!state.api) { await copyAndOpenGitHub(text.replace(/\s+/g, " "), msg); return; }
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

  function requestNow() {
    const ta = $("#request-text"), msg = $("#request-msg");
    const text = ta.value.trim();
    if (text.length < 3) { showMsg(msg, "Scrivi almeno qualche parola.", "warn"); return; }
    if (/^migliora apps\/[a-z0-9-]+:\s*$/i.test(text)) { showMsg(msg, "Scrivi cosa vuoi migliorare dopo i due punti.", "warn"); return; }
    ta.value = ""; $("#request-count").textContent = "0 / 500";
    generateNow(text, null, $("#request-now"));
    setTimeout(() => { $("#request-now").disabled = false; }, 1500);
  }

  // ---- avvio -------------------------------------------------------------
  async function init() {
    loadCatalog(window.__APPS__ || { apps: [], count: 0, categories: [], repo: null });
    $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderGrid(); });
    $("#request-text").addEventListener("input", (e) => { $("#request-count").textContent = `${e.target.value.length} / 500`; });
    $("#request-form").addEventListener("submit", submitRequest);
    $("#request-now").addEventListener("click", requestNow);
    $("#refresh").addEventListener("click", pull);
    $("#freq-save").addEventListener("click", saveFrequenza);
    $("#gen-close").addEventListener("click", () => showGenPanel(false));

    state.api = await detectApi();
    $("#request-offline").hidden = state.api;
    $("#request-now").hidden = !state.api;
    $("#request-queue").textContent = state.api ? "In coda" : "Copia e apri GitHub";
    $("#refresh").hidden = !state.api;
    $("#auto-local").hidden = !state.api;
    $("#auto-remote").hidden = state.api;
    await Promise.all([refreshCatalog(), loadRequests(), loadIdeas(), loadConfig()]);
    if (state.api) pollGen();
  }

  init();
})();
