/* monetize.js — l'unico pezzo condiviso tra tutte le app.
 * Le app restano un singolo index.html e mettono solo dei segnaposto:
 *   <div data-ad="top"></div>                          → annuncio AdSense (se CONFIG.adsense.client è impostato)
 *   <div data-affiliate data-items='[{"t":"Pentola per pasta","q":"pentola pasta 5 litri"}]'></div>
 *                                                      → box "Prodotti utili" con link Amazon (tag affiliato se impostato)
 *   <div data-support></div>                           → bottone "Sostieni il progetto" (se CONFIG.support.url è impostato)
 *   <section data-pro="Nome funzione">…</section>       → contenuto Pro: oscurato finché non c'è un Pass Pro valido
 *   Monetize.isPro() / Monetize.onPro(fn)               → per logica JS che dipende dal Pro
 * Compila CONFIG una volta sola: finché un campo è vuoto, il relativo blocco non compare.
 * Le chiavi Pro non stanno qui: qui ci sono solo gli hash SHA-256 (tools/chiavi.mjs le genera).
 */
(() => {
  "use strict";

  const CONFIG = {
    adsense: { client: "" },                          // es. "ca-pub-1234567890123456" (da AdSense → Account → codice editore)
    affiliate: { amazonTag: "" },                     // es. "unappalgiorno-21" (Amazon Associates)
    support: { url: "https://ko-fi.com/giovannicapozzoli", label: "Offrimi un caffè su Ko-fi" }, // es. "https://ko-fi.com/tuonome" oppure link PayPal.me
    pro: {
      buyUrl: "",                                     // es. "https://tuonome.gumroad.com/l/pass-pro"
      price: "",                                      // es. "4,99 €" (solo testo mostrato)
      keyHashes: [
        "0f074f3374b231ca6f3de5a047b6af46980137e41e00fcab8468cda873fedb32",
        "23be9c1398b9485bc4b0201b17df2982650978e0caa20e0987e08ca3745368c2",
        "32739d618b3360582b65a80810c305004daf32f3255232cfc4ddaad65debc8ed",
        "88e595129080b632fdaa116188db19536514ceeef72a226722b789ad5df2e303",
        "af5654854cb5c96a90e370dfb5ef1277fb1ba41204a097df006b26a9cbe161b3",
      ],
    },
  };

  const PRO_KEY = "app-al-giorno:pro-key";
  let proState = null; // null = da verificare, true/false
  const proListeners = [];

  // ---------- util ----------
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  };
  async function sha256(text) {
    if (!(globalThis.crypto && crypto.subtle)) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const normalizeKey = (k) => String(k || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Stile minimo, neutro: eredita colori e font dell'app tramite currentColor/inherit.
  const style = `
    .mz-box { border: 1px dashed currentColor; opacity: .85; border-radius: 12px; padding: .75rem 1rem; margin: 1.25rem 0; font-size: .95rem; line-height: 1.45; }
    .mz-box h4 { margin: 0 0 .4rem; font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }
    .mz-box ul { margin: 0; padding-left: 1.1rem; }
    .mz-box a { color: inherit; }
    .mz-ad { min-height: 90px; margin: 1.25rem 0; text-align: center; }
    .mz-support { display: inline-flex; align-items: center; gap: .5rem; min-height: 44px; padding: .5rem 1rem; border-radius: 999px; border: 1.5px solid currentColor; text-decoration: none; font-weight: 600; color: inherit; }
    .mz-support-wrap { margin: 1.25rem 0; text-align: center; }
    .mz-top { display: inline-flex; align-items: center; gap: .35rem; min-height: 36px; padding: .25rem .8rem; border-radius: 999px; background: #ffd166; color: #1a1a1a; text-decoration: none; font-weight: 700; font-size: .85rem; margin-left: auto; box-shadow: 0 2px 8px rgba(0,0,0,.18); white-space: nowrap; }
    .mz-top-row { display: flex; align-items: center; gap: .75rem; }
    [data-pro] { position: relative; }
    [data-pro].mz-locked > :not(.mz-lock) { filter: blur(3px); pointer-events: none; user-select: none; }
    .mz-lock { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; text-align: center; padding: 1rem; z-index: 2; }
    .mz-lock b { font-size: 1.05rem; }
    .mz-lock button, .mz-dialog button { font: inherit; min-height: 44px; padding: .5rem 1.1rem; border-radius: 999px; border: 1.5px solid currentColor; background: transparent; color: inherit; cursor: pointer; font-weight: 700; }
    .mz-dialog { border: 0; border-radius: 16px; padding: 0; max-width: min(92vw, 420px); color: inherit; background: Canvas; color: CanvasText; }
    .mz-dialog::backdrop { background: rgba(0,0,0,.5); }
    .mz-dialog form { padding: 1.25rem; display: grid; gap: .75rem; }
    .mz-dialog h3 { margin: 0; font-size: 1.2rem; }
    .mz-dialog p { margin: 0; font-size: .95rem; opacity: .85; }
    .mz-dialog input { font: inherit; font-size: 16px; min-height: 46px; padding: .5rem .8rem; border-radius: 10px; border: 1.5px solid currentColor; background: transparent; color: inherit; text-transform: uppercase; }
    .mz-dialog .row { display: flex; gap: .5rem; justify-content: flex-end; flex-wrap: wrap; }
    .mz-dialog .buy { text-decoration: none; display: inline-flex; align-items: center; }
    .mz-err { color: #c0392b; font-size: .9rem; min-height: 1.2em; }
  `;

  // ---------- AdSense ----------
  function renderAds() {
    const slots = $$("[data-ad]");
    if (!slots.length || !CONFIG.adsense.client) return;
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const s = el("script", { async: "", src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CONFIG.adsense.client)}`, crossorigin: "anonymous" });
      document.head.append(s);
    }
    for (const slot of slots) {
      slot.classList.add("mz-ad");
      const ins = el("ins", { class: "adsbygoogle", style: "display:block", "data-ad-client": CONFIG.adsense.client, "data-ad-format": "auto", "data-full-width-responsive": "true" });
      if (slot.dataset.adSlot) ins.setAttribute("data-ad-slot", slot.dataset.adSlot);
      slot.replaceChildren(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { /* ad blocker */ }
    }
  }

  // ---------- Affiliazione ----------
  function renderAffiliate() {
    for (const box of $$("[data-affiliate]")) {
      let items = [];
      try { items = JSON.parse(box.dataset.items || "[]"); } catch (_) { /* json errato */ }
      if (!items.length) continue;
      const tag = CONFIG.affiliate.amazonTag;
      const links = items.map(i => {
        const url = i.url || `https://www.amazon.it/s?k=${encodeURIComponent(i.q || i.t)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
        return el("li", {}, el("a", { href: url, target: "_blank", rel: "nofollow sponsored noopener" }, i.t));
      });
      box.classList.add("mz-box");
      box.replaceChildren(el("h4", {}, box.dataset.title || "Prodotti utili"), el("ul", {}, links),
        el("p", { style: "margin:.5rem 0 0;font-size:.8rem;opacity:.7" }, "Link di affiliazione: se acquisti, il progetto riceve una piccola commissione senza costi per te."));
    }
  }

  // ---------- Sostieni ----------
  function renderSupport() {
    if (!CONFIG.support.url) return;
    for (const box of $$("[data-support]")) {
      box.classList.add("mz-support-wrap");
      box.replaceChildren(el("a", { class: "mz-support", href: CONFIG.support.url, target: "_blank", rel: "noopener" }, "☕ ", box.dataset.label || CONFIG.support.label));
    }
    // Bottone in alto, accanto al link "← Tutte le app": visibile appena si apre la pagina.
    const back = document.querySelector('a[href$="../../index.html"], a[href$="../index.html"]');
    if (back && !document.querySelector(".mz-top")) {
      const pill = el("a", { class: "mz-top", href: CONFIG.support.url, target: "_blank", rel: "noopener", title: "Sostieni il progetto" }, "☕ Offrimi un caffè");
      const parent = back.parentElement;
      if (parent && parent.children.length === 1) { parent.classList.add("mz-top-row"); parent.append(pill); }
      else { const row = el("span", { class: "mz-top-row", style: "width:100%" }); back.replaceWith(row); row.append(back, pill); }
    }
  }

  // ---------- Pro ----------
  async function verifyKey(key) {
    const norm = normalizeKey(key);
    if (norm.length < 8) return false;
    const h = await sha256(norm);
    return !!h && CONFIG.pro.keyHashes.includes(h);
  }
  async function checkPro() {
    let saved = null;
    try { saved = localStorage.getItem(PRO_KEY); } catch (_) { /* storage bloccato */ }
    proState = saved ? await verifyKey(saved) : false;
    return proState;
  }
  function applyPro() {
    for (const sec of $$("[data-pro]")) {
      const lock = sec.querySelector(":scope > .mz-lock");
      if (proState) { sec.classList.remove("mz-locked"); lock?.remove(); continue; }
      sec.classList.add("mz-locked");
      if (lock) continue;
      const name = sec.dataset.pro || "Funzione Pro";
      sec.prepend(el("div", { class: "mz-lock" },
        el("b", {}, `🔒 ${name}`),
        el("span", { style: "font-size:.9rem;opacity:.85" }, "Disponibile con il Pass Pro, valido per tutte le app."),
        el("button", { type: "button", onclick: openDialog }, "Sblocca")));
    }
    for (const fn of proListeners) { try { fn(proState); } catch (_) { /* listener rotto */ } }
  }
  let dialog = null;
  function openDialog() {
    if (!dialog) {
      const input = el("input", { type: "text", placeholder: "AAG-XXXX-XXXX-XXXX", autocomplete: "off", spellcheck: "false", "aria-label": "Chiave Pass Pro" });
      const err = el("div", { class: "mz-err" });
      const form = el("form", { onsubmit: async (ev) => {
        ev.preventDefault();
        err.textContent = "Verifica…";
        if (await verifyKey(input.value)) {
          try { localStorage.setItem(PRO_KEY, normalizeKey(input.value)); } catch (_) { /* storage bloccato */ }
          proState = true; applyPro(); dialog.close();
        } else err.textContent = "Chiave non valida. Controlla di averla copiata tutta.";
      } },
        el("h3", {}, "Pass Pro"),
        el("p", {}, CONFIG.pro.buyUrl
          ? `Una sola chiave sblocca le funzioni Pro di tutte le app${CONFIG.pro.price ? `, ${CONFIG.pro.price} una tantum` : ""}. Se ce l'hai già, inseriscila qui.`
          : "Le funzioni Pro non sono ancora in vendita: torna presto."),
        input, err,
        el("div", { class: "row" },
          el("button", { type: "button", onclick: () => dialog.close() }, "Chiudi"),
          CONFIG.pro.buyUrl ? el("a", { class: "buy mz-support", href: CONFIG.pro.buyUrl, target: "_blank", rel: "noopener" }, "Acquista il Pass") : null,
          el("button", { type: "submit" }, "Sblocca")));
      dialog = el("dialog", { class: "mz-dialog" }, form);
      document.body.append(dialog);
    }
    dialog.showModal();
  }

  // ---------- avvio ----------
  async function init() {
    document.head.append(el("style", {}, style));
    renderAds(); renderAffiliate(); renderSupport();
    await checkPro(); applyPro();
  }
  window.Monetize = {
    isPro: () => !!proState,
    onPro: (fn) => { proListeners.push(fn); if (proState !== null) fn(proState); },
    unlock: openDialog,
    config: CONFIG,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
