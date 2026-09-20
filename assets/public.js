// Sito pubblico: catalogo degli strumenti per categoria, con ricerca. Legge window.__APPS__ (apps.js,
// generato da tools/build.mjs) e prova ad aggiornarlo da apps.json. Nessuna funzione di gestione: quelle
// stanno in admin.html / site.js.
(() => {
  "use strict";

  const CATEGORY_LABELS = {
    "produttivita": "Produttività",
    "salute-benessere": "Salute e benessere",
    "finanza-personale": "Soldi e fisco",
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
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== "") node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return node;
  };

  const state = { catalog: null, query: "", category: null };

  const visible = () => state.catalog.apps.filter(a => a.status !== "bozza");

  function renderStats() {
    const n = visible().length;
    $("#stats").textContent = n ? `${n} strumenti gratuiti` : "";
  }

  function renderCategories() {
    const counts = {};
    for (const a of visible()) counts[a.category] = (counts[a.category] || 0) + 1;
    const box = $("#categories");
    box.replaceChildren(el("button", { class: "chip", type: "button", "aria-pressed": String(state.category === null), onclick: () => setCategory(null) }, "Tutti"));
    for (const c of state.catalog.categories) {
      if (!counts[c]) continue;
      box.append(el("button", { class: "chip", type: "button", "aria-pressed": String(state.category === c), onclick: () => setCategory(state.category === c ? null : c) },
        `${CATEGORY_LABELS[c] || c} · ${counts[c]}`));
    }
  }

  function setCategory(c) { state.category = c; renderCategories(); renderGrid(); }

  function matches(app) {
    if (state.category && app.category !== state.category) return false;
    if (!state.query) return true;
    const hay = [app.title, app.description, app.tags.join(" "), CATEGORY_LABELS[app.category] || "", app.business?.keyword || "", (app.business?.keywords || []).join(" ")].join(" ").toLowerCase();
    return state.query.split(/\s+/).every(w => hay.includes(w));
  }

  function card(app) {
    const href = `apps/${app.slug}/`;
    const d = app.design || {};
    return el("article", { class: `card p-${d.palette || "none"}` },
      el("h3", {}, el("a", { href }, app.title)),
      el("p", {}, app.description),
      el("div", { class: "badges" },
        el("span", { class: "badge cat" }, CATEGORY_LABELS[app.category] || app.category),
        ...app.tags.slice(0, 3).map(t => el("span", { class: "badge" }, t))),
      el("div", { class: "card-actions one" }, el("a", { class: "btn btn-accent", href }, "Apri")));
  }

  function renderGrid() {
    const grid = $("#grid");
    const list = visible().filter(matches);
    if (!list.length) { grid.replaceChildren(el("p", { class: "empty" }, "Nessuno strumento corrisponde alla ricerca.")); return; }
    if (state.category || state.query) { grid.replaceChildren(...list.map(card)); return; }
    // vista iniziale: raggruppata per categoria, i più recenti prima
    const groups = new Map();
    for (const a of list) (groups.get(a.category) || groups.set(a.category, []).get(a.category)).push(a);
    const out = [];
    for (const [c, apps] of groups) {
      out.push(el("h2", { class: "group-title" }, CATEGORY_LABELS[c] || c));
      out.push(...apps.map(card));
    }
    grid.replaceChildren(...out);
  }

  function load(catalog) { state.catalog = catalog; renderStats(); renderCategories(); renderGrid(); }

  async function refresh() {
    try { const r = await fetch("apps.json", { cache: "no-store" }); if (r.ok) load(await r.json()); }
    catch (_) { /* file:// o offline: resta apps.js */ }
  }

  load(window.__APPS__ || { apps: [], count: 0, categories: [] });
  $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderGrid(); });
  refresh();
})();
