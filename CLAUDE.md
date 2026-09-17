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
   prendi la **prima** dall'alto: è il brief dell'app (`source: "richiesta"`). Le richieste
   possono contenere anche indicazioni generali (es. "d'ora in poi usa colori scuri"): se una
   riga è un'indicazione e non un'app, applicala, marcala `[x]` con nota `→ applicata` e
   passa alla riga successiva. Se non ci sono richieste aperte, inventa tu (`source: "autonoma"`).
3. **Inventa (solo se serve)**: leggi `apps.json` (se esiste) e conta le app per categoria.
   Scegli la categoria **meno popolata** tra quelle in CATEGORIE. Proponi 5 idee, scarta
   quelle simili a titoli/tag già presenti, scegli la più utile nella vita quotidiana.
   Varia anche il tipo di interazione (form, canvas, tabella, timer, editor, quiz, calcolo...).
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
   - responsive da 400px di larghezza, tema chiaro/scuro con `prefers-color-scheme`;
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
  "status": "pronta"
}
```

- `slug` = nome esatto della cartella in `apps/`.
- `description`: una frase, max 160 caratteri, in italiano.
- `category`: uno dei valori in CATEGORIE.
- `tags`: 2–5 parole minuscole.
- `source`: `"richiesta"` oppure `"autonoma"`. Se `"richiesta"`, copia in `request` il testo
  originale della richiesta.
- `status`: `"pronta"` (default) oppure `"bozza"`.

## CATEGORIE

`produttivita`, `salute-benessere`, `finanza-personale`, `studio-apprendimento`,
`casa-cucina`, `creativita`, `utility-sviluppatori`, `giochi-educativi`,
`calcolatori-convertitori`, `testo-scrittura`.

## Struttura del repo

- `index.html`, `assets/` — sito vetrina (non toccare, salvo richiesta esplicita).
- `apps.json` — GENERATO da `tools/build.mjs`, non modificarlo a mano.
- `apps/<slug>/` — una cartella per app.
- `richieste.md` — coda delle richieste dell'utente.
- `tools/` — `build.mjs` (catalogo), `check.mjs` (quality gate), `serve.mjs` (server locale).

## Stile del codice nelle app

- Un solo `<style>` e un solo `<script>` in fondo al body; niente framework, niente build.
- Variabili CSS per i colori; system font stack; nessun `!important` gratuito.
- Funzioni piccole, nomi in italiano o inglese ma coerenti nello stesso file.
- Persistenza con una chiave `localStorage` prefissata dallo slug (es. `dividi-il-conto:v1`).
- Un commento di 2–3 righe in testa allo script che spiega il modello dati.
