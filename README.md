# Un'App al Giorno

Una fabbrica automatica di piccole app web: ogni 5 ore un agente Claude (routine cloud)
crea una nuova app single-file in `apps/`, la aggiunge al catalogo e fa push su questo repo.
Il sito vetrina (`index.html`) le mostra tutte e permette di lasciare richieste per le prossime.

Zero dipendenze, zero servizi a pagamento: solo HTML/CSS/JS vanilla, Node (per gli script
di supporto) e git.

## Uso in locale

1. Doppio click su `avvia.cmd` (oppure `node tools/serve.mjs`).
   Fa `git pull`, avvia un server su http://localhost:8787 e apre il browser.
2. Nel sito: sfoglia le app, aprile, cerca, filtra per categoria.
3. Sezione **Richieste**: scrivi cosa vuoi che venga creato → viene aggiunta a `richieste.md`,
   committata e pushata. L'agente la prenderà alla prossima esecuzione.
4. Bottone **Aggiorna** nel sito = `git pull` per scaricare le app nuove.

Ogni app funziona anche aperta con doppio click su `apps/<cartella>/index.html`.

## Come funziona la generazione

Le regole complete sono in [`CLAUDE.md`](CLAUDE.md) (procedura, vincoli, formato dei
metadati). In breve: l'agente legge `richieste.md`, prende la prima richiesta aperta (o
inventa un'idea nella categoria meno popolata), scrive `apps/<data>-<slug>/index.html` +
`app.json`, lancia `tools/check.mjs` (quality gate: nessun CDN, nessuna chiamata di rete,
un solo file) e `tools/build.mjs` (rigenera `apps.json`), poi committa e pusha.

Per generare un'app a mano: apri Claude Code in questa cartella e scrivi
"esegui la PROCEDURA GENERAZIONE di CLAUDE.md".

## Script

| Comando | Cosa fa |
|---|---|
| `node tools/build.mjs` | Scansiona `apps/*/app.json`, valida, scrive `apps.json` |
| `node tools/check.mjs apps/<cartella>` | Quality gate su una app (exit ≠ 0 se viola le regole) |
| `node tools/serve.mjs` | Server locale + API richieste (porta 8787, `PORT` per cambiarla) |

## Pubblicare online (opzionale, futuro)

Il sito è statico e con percorsi relativi: basta attivare GitHub Pages sul branch `main`
(cartella root). La sezione Richieste, senza server locale, mostra il link per editare
`richieste.md` direttamente su GitHub.
