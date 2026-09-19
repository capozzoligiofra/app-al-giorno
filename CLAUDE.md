# Un'App al Giorno — regole per l'agente

Questo repository è una fabbrica automatica di piccole applicazioni web. Ogni esecuzione
(routine cloud ogni 5 ore, oppure `claude` lanciato a mano) produce **una** nuova app in
`apps/` e aggiorna il catalogo `apps.json` che alimenta il sito vetrina (`index.html`).

Principi: zero dipendenze esterne, zero servizi a pagamento, codice genuino e leggibile,
UI in italiano, app **davvero utili** (non demo vistose).

**Obiettivo (dal 2026-09-17): ogni app è pensata per monetizzare.** Non "un'app carina", ma un
tool che risponde a una ricerca reale che le persone fanno su Google in italiano, che si posiziona,
che tiene l'utente sulla pagina e che ha agganci di guadagno (pubblicità, affiliazione, Pass Pro,
donazioni). Vedi MERCATO, SEO e MONETIZZAZIONE. Un'app senza una keyword con domanda reale
non va costruita.

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
3. **Ricerca di mercato (sempre, anche con una richiesta)**: vedi MERCATO. Se non c'è una
   richiesta, guarda prima `idee.md`: prendi la **prima** idea e rimuovila dal file. Altrimenti
   individua tu una nicchia. In entrambi i casi, prima di scrivere codice, definisci il blocco
   `business` (keyword principale, intento, target, concorrenti, perché il nostro tool vince,
   canali di guadagno, funzioni Pro). Se hai WebSearch/WebFetch disponibili, usali per verificare
   che la ricerca esista davvero e per guardare i primi 3 risultati concorrenti; se non li hai,
   ragiona su ricerche che conosci essere frequenti (fisco, casa, salute, soldi, burocrazia,
   scuola, auto, viaggi) e scegli la più specifica possibile.
   **A fine esecuzione** `idee.md` deve contenere 5 idee aperte, ognuna già con la keyword:
   `- [ ] Titolo — keyword: "ricerca esatta" — perché conviene (una frase)`.
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
     esterni, `XMLHttpRequest`/`WebSocket`/`EventSource`, iframe esterni, immagini remote,
     tracking/analytics; `fetch` solo verso i servizi elencati in RETE;
   - consentiti: `localStorage`/`IndexedDB` per la persistenza, SVG inline, data-URI,
     `crypto.randomUUID`, Web APIs offline (Canvas, Clipboard, File, Notification...);
   - deve funzionare aperta sia via `http://` sia via doppio click (`file://`);
   - **mobile-first**: progettata prima per uno schermo 360–430px e poi adattata al desktop
     (vedi MOBILE); tema chiaro/scuro con `prefers-color-scheme`;
   - usabile davvero: stato vuoto gestito, validazione input, tastiera (Enter/Esc),
     nessun `alert()`/`confirm()`/`prompt()`, nessun errore in console;
   - un breve link "← Tutte le app" in alto che punta a `../../index.html`;
   - dimensione massima 300 KB;
   - **SEO e monetizzazione** (vedi le sezioni): meta description, canonical, Open Graph,
     JSON-LD `WebApplication`, guida testuale sotto il tool (≥ 350 parole), FAQ, e i segnaposto
     `data-ad`, `data-support`, `data-affiliate` (se pertinente) e almeno una funzione `data-pro`,
     con `<script src="../../assets/monetize.js"></script>` in fondo al body, prima dello script dell'app.
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
  "design": { "layout": "card-stack", "palette": "verde-bosco", "font": "sans-geometrico" },
  "business": {
    "keyword": "dividere le spese tra amici",
    "keywords": ["calcolo spese di gruppo", "chi deve dare quanto a chi", "dividere il conto della vacanza"],
    "intent": "Chi torna da una vacanza/cena di gruppo e vuole sapere subito chi paga chi, senza registrarsi a Splitwise.",
    "target": "Gruppi di amici e coinquilini, 20-45 anni, da telefono.",
    "competitors": ["Splitwise (richiede account)", "Tricount", "calcolatori generici sui blog"],
    "edge": "Zero registrazione, funziona offline, risultato in 30 secondi, copia-riepilogo per WhatsApp.",
    "monetization": ["adsense", "pro", "support"],
    "pro": ["Esporta in PDF/CSV", "Più gruppi salvati", "Valute diverse"],
    "affiliate": []
  }
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
- `business`: obbligatorio per le app nuove (vedi MERCATO). `keyword` = la ricerca principale,
  in minuscolo, come la digiterebbe una persona; `keywords` = 2–5 varianti; `intent`, `target`,
  `edge` = frasi brevi e concrete; `competitors` = 1–4 voci; `monetization` = sottoinsieme di
  `adsense`, `affiliate`, `pro`, `support`; `pro` = 1–4 funzioni Pro davvero implementate;
  `affiliate` = elenco `{ "t": "nome prodotto", "q": "ricerca amazon" }` (può essere vuoto).

## MERCATO — come si sceglie cosa costruire

Una app viene costruita solo se risponde a una **ricerca reale in italiano** con domanda
ricorrente. Ordine di preferenza delle nicchie (alto valore per la pubblicità e intento chiaro):
1. **Soldi e fisco**: calcolo TFR, netto da lordo, tassazione affitti, mutuo/rata, interessi
   conto deposito, IMU, bollo auto, partita IVA forfettario, pensione stimata.
2. **Casa e famiglia**: costi di un figlio/animale, consumi elettrodomestici in bolletta,
   calcolo metri quadri/vernice/piastrelle, ISEE semplificato, scadenze e bonus.
3. **Salute e forma**: calorie/macro, peso forma, giorni fertili, dosaggio per peso,
   sonno, idratazione, allenamento.
4. **Lavoro e burocrazia**: ferie/permessi, giorni lavorativi tra date, preavviso dimissioni,
   calcolo straordinari, calendario turni, scadenze fiscali.
5. **Auto e viaggi**: costo viaggio (carburante+pedaggi), rimborso chilometrico, fuso orario,
   bagaglio a mano compagnie, budget vacanza.
6. **Studio e testi**: media voti, crediti, conta parole, generatori (password, nomi, lorem),
   convertitori.
Evita: giochi, demo estetiche, tool troppo generici ("calcolatrice"), tutto ciò che richiede dati
in tempo reale che non abbiamo (cambi, meteo, borsa): le uniche fonti esterne ammesse sono in RETE.

Criteri di scelta (rispondi per iscritto nel blocco `business`): la ricerca esiste ed è
ricorrente? l'intento è "voglio un risultato ora"? i primi risultati attuali sono articoli
prolissi o tool con registrazione/pubblicità invasiva (→ spazio per noi)? il tool si finisce in
una pagina, offline, senza API? ci sono almeno 1–2 funzioni Pro sensate?
Non ripetere una keyword già coperta da un'app esistente (controlla `business.keyword` in
`apps.json`); una keyword vicina va bene solo se l'intento è diverso.

## SEO — ogni app è una pagina che deve posizionarsi

- `<title>`: "{Nome tool}: {keyword con iniziale maiuscola} online gratis" (max 60 caratteri).
- `<meta name="description">`: 120–160 caratteri, con la keyword, che promette il risultato.
- `<link rel="canonical" href="https://capozzoligiofra.github.io/app-al-giorno/apps/<slug>/">`.
- Open Graph: `og:title`, `og:description`, `og:type=website`, `og:url` (= canonical), `og:locale=it_IT`.
- JSON-LD `application/ld+json` con `@type: "WebApplication"`, `name`, `description`, `url`,
  `applicationCategory`, `operatingSystem: "Any"`, `offers: { "@type": "Offer", "price": "0", "priceCurrency": "EUR" }`,
  `inLanguage: "it"`. Se c'è una FAQ, aggiungi anche un blocco `FAQPage`.
- Struttura della pagina: `<h1>` con la keyword; il tool **subito** (above the fold su telefono);
  poi `<section id="guida">` con `<h2>`: come funziona, come si calcola/legge il risultato,
  esempi concreti con numeri, errori comuni, e una FAQ con 3–5 domande reali (`<h3>`).
  Minimo **350 parole** di testo utile, in italiano naturale, niente riempitivo: è ciò che
  Google e AdSense valutano.
- Link interno "← Tutte le app" e, in fondo, link a `../../privacy.html` e a 1–2 app correlate
  (se esistono) con anchor descrittive.
- Niente testi nascosti, niente keyword stuffing: la keyword compare in title, h1, description,
  primo paragrafo e 1–2 volte nella guida, poi si scrive per persone.

## MONETIZZAZIONE — gli agganci nella pagina

Tutto passa da `assets/monetize.js` (unico file condiviso, già scritto: non modificarlo dalle
app). L'app mette solo segnaposto; finché l'utente non compila gli ID, non compare nulla.
- `<div data-ad="top"></div>` subito sotto il risultato del tool (mai sopra il tool su telefono)
  e `<div data-ad="bottom"></div>` in fondo alla guida. Non più di 2 per pagina.
- `<div data-support></div>` in fondo alla pagina (bottone "Offrimi un caffè").
- `<div data-affiliate data-title="Prodotti utili" data-items='[{"t":"…","q":"…"}]'></div>`
  solo se esistono prodotti davvero pertinenti (es. Timer Pasta → pentola; calcolo vernice →
  rullo). Mai prodotti a caso. `t` = nome mostrato, `q` = ricerca Amazon.
- **Pro**: la versione gratuita deve essere completa e utile da sola; le funzioni Pro sono
  extra di valore (export PDF/CSV, salvataggio di più profili/scenari, confronto tra scenari,
  stampa, grafici avanzati, senza limiti dove il free ne ha uno ragionevole). Ogni funzione Pro
  va **implementata davvero** e racchiusa in `<section data-pro="Nome funzione">…</section>`;
  monetize.js la oscura finché non c'è un Pass Pro valido. Per logica JS usa
  `window.Monetize.isPro()` o `Monetize.onPro(fn)`. Il blocco Pro deve essere visibile (oscurato)
  vicino al risultato, così l'utente sa cosa ottiene.
- In fondo alla pagina una riga: "Questa pagina può contenere annunci e link di affiliazione.
  <a href="../../privacy.html">Privacy</a>".

## RETE — servizi esterni ammessi (gratuiti, senza chiave)

Un'app può chiamare con `fetch` **solo** questi servizi, e deve funzionare comunque (in modo
ridotto) se la chiamata fallisce o l'utente è offline:
- **Nominatim (OpenStreetMap)** `https://nominatim.openstreetmap.org/search?q=…&countrycodes=it&format=jsonv2&limit=6&addressdetails=1&accept-language=it`
  → ricerca di qualsiasi comune/frazione/indirizzo. Regole d'uso: max 1 richiesta al secondo
  (debounce ≥ 400 ms, minimo 3 caratteri), cache dei risultati, attribuzione "© OpenStreetMap".
- **OSRM** `https://router.project-osrm.org/route/v1/driving/lon1,lat1;lon2,lat2?overview=false&steps=true`
  → distanza e durata su strada reale (server demo pubblico: nessuna garanzia, quindi fallback
  su stima in linea d'aria × 1,2).
- **Dati del repo** (stessa origine, percorso relativo): `../../data/carburanti.json` = medie
  giornaliere dei prezzi carburante MIMIT per regione e provincia (aggiornato ogni mattina da
  una GitHub Action; struttura: `updated`, `italia`, `regioni`, `province`, `regioneDiProvincia`).
  Usalo per qualunque app che parli di carburante, invece di numeri fissi (con fallback incorporato
  per l'apertura da file://).
- **Dati del repo**: `../../data/auto.json` = catalogo auto EEA (marca → modelli con carburante,
  consumo omologato `dichiarato` e stima su strada `reale`, cilindrata, kW; 430 KB: caricalo solo
  quando l'utente apre il selettore). Generato da `tools/auto.mjs` ogni mese.
Niente altro: niente API con chiave, niente servizi a pagamento, niente "prova gratuita".
Mostra sempre la fonte e la data del dato accanto al risultato.

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
- `assets/monetize.js` — agganci di monetizzazione condivisi (ID, Pass Pro); `privacy.html`.
- `sitemap.xml`, `robots.txt` — GENERATI da `tools/build.mjs`.
- `data/carburanti.json` — GENERATO da `tools/carburanti.mjs` (GitHub Action giornaliera).
- `tools/` — `build.mjs` (catalogo), `check.mjs` (quality gate), `serve.mjs` (server locale).

## Stile del codice nelle app

- Un solo `<style>` e un solo `<script>` in fondo al body; niente framework, niente build.
- Variabili CSS per i colori; system font stack; nessun `!important` gratuito.
- Funzioni piccole, nomi in italiano o inglese ma coerenti nello stesso file.
- Persistenza con una chiave `localStorage` prefissata dallo slug (es. `dividi-il-conto:v1`).
- Un commento di 2–3 righe in testa allo script che spiega il modello dati.
