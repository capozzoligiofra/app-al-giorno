# Un'App al Giorno — regole per l'agente

Questo repository è una fabbrica automatica di piccole applicazioni web. Ogni esecuzione
(routine cloud ogni 5 ore, oppure `claude` lanciato a mano) produce **una** nuova app in
`apps/` e aggiorna il catalogo `apps.json` che alimenta il sito vetrina (`index.html`).

Principi: zero dipendenze esterne, zero servizi a pagamento, codice genuino e leggibile,
UI in italiano, app **davvero utili** (non demo vistose).

## PROCEDURA GENERAZIONE

Esegui i passi in ordine. Non saltarne nessuno.

1. **Aggiorna**: `git pull --ff-only origin main` (se fallisce perché non c'è remote, ignora).
2. **Leggi la coda**: apri `richieste.md`. Se esiste almeno una riga che inizia con `- [ ]`,
   prendi la **prima** dall'alto. Tre tipi di riga:
   - **nuova app** (default): è il brief dell'app (`source: "richiesta"`);
   - **miglioramento**: riga che inizia con `migliora apps/<slug>:` → NON creare una nuova app;
     modifica l'app esistente in quella cartella seguendo il testo, incrementa `version` in
     `app.json`, aggiungi una voce a `changelog`, marca la riga `[x] … → apps/<slug> v<N>`;
   - **indicazione generale** (es. "usa colori più vivaci"): applicala a questa esecuzione,
     aggiungila in fondo a `preferenze.md` (una riga), marca la riga `[x] … → applicata` e
     passa alla riga successiva.
   Se non ci sono richieste aperte, inventa tu (`source: "autonoma"`).
   Leggi sempre anche `preferenze.md`: sono indicazioni permanenti dell'utente e prevalgono
   su questo file in caso di conflitto.
3. **Inventa (solo se serve)**: guarda prima `idee.md`: se contiene idee, prendi la **prima**
   e rimuovila dal file. Altrimenti leggi `apps.json`, conta le app per categoria, scegli la
   categoria **meno popolata** tra quelle in CATEGORIE, proponi 5 idee, scarta quelle simili a
   titoli/tag già presenti, scegli la più utile nella vita quotidiana. Varia anche il tipo di
   interazione (form, canvas, tabella, timer, editor, quiz, calcolo...).
   In ogni caso, **a fine esecuzione** `idee.md` deve contenere 5 idee aperte: aggiungine di
   nuove (una riga `- [ ] Titolo — una frase`) finché non sono 5. L'utente le approva dal sito.
3b. **Scegli il design** (obbligatorio, vedi DESIGN): leggi il campo `design` delle ultime 4
   app in `apps.json` e scegli `layout`, `palette` e `font` in modo che **nessuno dei tre**
   coincida con l'app precedente e che `layout` e `palette` non compaiano nelle ultime 4.
   Il design deve essere coerente con il contenuto (una app di cucina e un tool per
   sviluppatori non devono sembrare fatte con lo stesso stampo).
4. **Crea la cartella** `apps/YYYY-MM-DD-slug/` (data odierna UTC, slug kebab-case ASCII,
   max 40 caratteri). Se esiste già, aggiungi `-2`, `-3`, ...
   Dentro: `index.html` (l'app, un solo file) e `app.json` (metadati, vedi FORMATO).
5. **Vincoli dell'app** (verificati da `tools/check.mjs`):
   - un solo file `index.html`, HTML+CSS+JS vanilla, `<!doctype html>`, `<html lang="it">`,
     `<meta name="viewport">`, un `<title>` significativo;
   - **vietati**: `<script src>`/`<link href>` verso URL esterni, `@import` remoti, font
     esterni, `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource` verso host esterni, iframe
     esterni, immagini remote, tracking/analytics;
   - consentiti: `localStorage`/`IndexedDB` per la persistenza, SVG inline, data-URI,
     `crypto.randomUUID`, Web APIs offline (Canvas, Clipboard, File, Notification...);
   - deve funzionare aperta sia via `http://` sia via doppio click (`file://`);
   - **mobile-first**: progettata prima per uno schermo 360–430px e poi adattata al desktop
     (vedi MOBILE); tema chiaro/scuro con `prefers-color-scheme`;
   - usabile davvero: stato vuoto gestito, validazione input, tastiera (Enter/Esc),
     nessun `alert()`/`confirm()`/`prompt()`, nessun errore in console;
   - un breve link "← Tutte le app" in alto che punta a `../../index.html`;
   - dimensione massima 300 KB.
6. **Verifica**: `node tools/check.mjs apps/YYYY-MM-DD-slug` poi `node tools/build.mjs`.
   Se uno dei due fallisce, correggi e ripeti finché entrambi terminano con exit code 0.
7. **Chiudi la richiesta**: se hai usato una riga di `richieste.md`, trasformala da
   `- [ ] testo` in `- [x] testo → apps/YYYY-MM-DD-slug`. Non cancellare mai righe.
8. **Commit e push**: `git add -A && git commit -m "app: <Titolo> (YYYY-MM-DD)" && git push origin main`.
   Niente branch, niente pull request. Se il push fallisce per un aggiornamento remoto,
   fai `git pull --rebase origin main` e ripeti il push.
9. **Mai lasciare il repo rotto**: se qualcosa non è risolvibile, imposta `"status": "bozza"`
   in `app.json`, assicurati che `build.mjs` passi, e committa comunque.

## FORMATO app.json

```json
{
  "title": "Dividi il Conto",
  "slug": "2026-09-17-dividi-il-conto",
  "date": "2026-09-17",
  "description": "Registra le spese di un gruppo e calcola chi deve dare quanto a chi.",
  "category": "finanza-personale",
  "tags": ["spese", "gruppo", "viaggio"],
  "source": "autonoma",
  "request": null,
  "status": "pronta",
  "version": 1,
  "changelog": [],
  "design": { "layout": "card-stack", "palette": "verde-bosco", "font": "sans-geometrico" }
}
```

- `slug` = nome esatto della cartella in `apps/`.
- `description`: una frase, max 160 caratteri, in italiano.
- `category`: uno dei valori in CATEGORIE.
- `tags`: 2–5 parole minuscole.
- `source`: `"richiesta"` oppure `"autonoma"`. Se `"richiesta"`, copia in `request` il testo
  originale della richiesta.
- `status`: `"pronta"` (default) oppure `"bozza"`.
- `version`: intero, parte da 1; si incrementa a ogni "migliora".
- `changelog`: array di stringhe `"v2 (YYYY-MM-DD): cosa è cambiato"`; vuoto alla nascita.
- `design`: obbligatorio, con `layout`, `palette`, `font` scelti dalle liste in DESIGN.

## CATEGORIE

`produttivita`, `salute-benessere`, `finanza-personale`, `studio-apprendimento`,
`casa-cucina`, `creativita`, `utility-sviluppatori`, `giochi-educativi`,
`calcolatori-convertitori`, `testo-scrittura`.

## DESIGN — ogni app deve avere una personalità visiva propria

Le app non devono sembrare fatte con lo stesso stampo. Ognuna sceglie e dichiara in `app.json`:

- `layout` (struttura della pagina), uno tra:
  `card-stack` (pila di schede), `single-column` (una colonna con sezioni separate da
  spazio, senza bordi), `tabs` (barra tab in basso su mobile), `wizard` (passi in sequenza),
  `dashboard` (griglia di riquadri con numeri grandi), `split` (input in alto fisso, risultato
  sotto scorrevole), `canvas` (area di disegno/grafico a tutto schermo con toolbar),
  `list-detail` (elenco + dettaglio), `fullscreen-tool` (un solo grande controllo centrale,
  es. timer o contatore), `sheet` (contenuto + pannello che sale dal basso).
- `palette` (colore dominante + carattere), uno tra:
  `verde-bosco`, `arancio-caldo`, `blu-notte`, `viola-elettrico`, `rosso-mattone`,
  `giallo-senape`, `grigio-carta` (monocromo con un solo accento), `azzurro-cielo`,
  `rosa-cipria`, `nero-neon` (scuro con accento fluo), `terracotta`, `verde-menta`.
- `font` (stack di sistema, niente font esterni), uno tra:
  `sans-geometrico` (system-ui), `serif-editoriale` (Georgia, "Times New Roman"),
  `mono-tecnico` (ui-monospace, Consolas), `rounded` ("Segoe UI", -apple-system, con
  bordi molto arrotondati), `condensed` ("Arial Narrow", "Roboto Condensed", sans-serif,
  con titoli in maiuscolo).

Regole: `layout` e `palette` non devono comparire nelle ultime 4 app; nessuno dei tre campi
uguale all'app immediatamente precedente. Oltre alle scelte dichiarate, varia anche
spaziature, raggio dei bordi, peso dei titoli, tipo di controlli (bottoni grandi, chip,
slider, toggle, stepper) e micro-interazioni. Il design deve servire il contenuto.

## MOBILE — regole (il quality gate ne verifica alcune)

- Larghezza di riferimento 390px; tutto leggibile senza zoom (testo base ≥ 16px, input
  con `font-size` ≥ 16px per evitare lo zoom automatico di iOS).
- Target touch ≥ 44×44px per bottoni, link, checkbox custom; spaziatura tra target ≥ 8px.
- Azioni principali raggiungibili col pollice: in basso (barra fissa o bottone flottante),
  con `padding-bottom: env(safe-area-inset-bottom)`.
- Niente hover come unica affordance; niente tabelle larghe (usa liste/card su mobile);
  niente `overflow-x` sul body; immagini/canvas `max-width: 100%`.
- Tastiere corrette: `inputmode="decimal|numeric"`, `type="email|tel|date"`,
  `autocomplete` sensato, `enterkeyhint`.
- Altezza: usa `100dvh` (non `100vh`) per le viste a tutto schermo.
- `<meta name="theme-color">` coerente con la palette e `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Desktop = miglioramento progressivo (`@media (min-width: 700px)`), mai il contrario.

## Struttura del repo

- `index.html`, `assets/` — sito vetrina (non toccare, salvo richiesta esplicita).
- `apps.json` — GENERATO da `tools/build.mjs`, non modificarlo a mano.
- `apps/<slug>/` — una cartella per app.
- `richieste.md` — coda delle richieste dell'utente (nuove app, "migliora", indicazioni).
- `idee.md` — 5 idee proposte dall'agente; l'utente le approva dal sito (diventano richieste).
- `preferenze.md` — indicazioni permanenti dell'utente, accumulate nel tempo.
- `tools/` — `build.mjs` (catalogo), `check.mjs` (quality gate), `serve.mjs` (server locale).

## Stile del codice nelle app

- Un solo `<style>` e un solo `<script>` in fondo al body; niente framework, niente build.
- Variabili CSS per i colori; system font stack; nessun `!important` gratuito.
- Funzioni piccole, nomi in italiano o inglese ma coerenti nello stesso file.
- Persistenza con una chiave `localStorage` prefissata dallo slug (es. `dividi-il-conto:v1`).
- Un commento di 2–3 righe in testa allo script che spiega il modello dati.
