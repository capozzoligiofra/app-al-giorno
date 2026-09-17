// GENERATO da tools/build.mjs — non modificare a mano.
window.__APPS__ = {
  "repo": "https://github.com/capozzoligiofra/app-al-giorno",
  "count": 5,
  "categories": [
    "produttivita",
    "salute-benessere",
    "finanza-personale",
    "studio-apprendimento",
    "casa-cucina",
    "creativita",
    "utility-sviluppatori",
    "giochi-educativi",
    "calcolatori-convertitori",
    "testo-scrittura"
  ],
  "design": {
    "layout": [
      "card-stack",
      "single-column",
      "tabs",
      "wizard",
      "dashboard",
      "split",
      "canvas",
      "list-detail",
      "fullscreen-tool",
      "sheet"
    ],
    "palette": [
      "verde-bosco",
      "arancio-caldo",
      "blu-notte",
      "viola-elettrico",
      "rosso-mattone",
      "giallo-senape",
      "grigio-carta",
      "azzurro-cielo",
      "rosa-cipria",
      "nero-neon",
      "terracotta",
      "verde-menta"
    ],
    "font": [
      "sans-geometrico",
      "serif-editoriale",
      "mono-tecnico",
      "rounded",
      "condensed"
    ]
  },
  "apps": [
    {
      "title": "Timer Pasta",
      "slug": "2026-09-17-timer-pasta",
      "date": "2026-09-17",
      "description": "Tempi di cottura di 24 formati di pasta, timer a tutto schermo con avviso sonoro e dosi di acqua e sale.",
      "category": "casa-cucina",
      "tags": [
        "cucina",
        "timer",
        "pasta",
        "cottura"
      ],
      "source": "autonoma",
      "request": null,
      "status": "pronta",
      "version": 1,
      "changelog": [],
      "design": {
        "layout": "fullscreen-tool",
        "palette": "giallo-senape",
        "font": "rounded"
      },
      "business": null,
      "size": 31574
    },
    {
      "title": "Piano dei Pasti",
      "slug": "2026-09-17-piano-dei-pasti",
      "date": "2026-09-17",
      "description": "Pianifica pranzi e cene della settimana con le tue ricette e genera automaticamente la lista della spesa.",
      "category": "casa-cucina",
      "tags": [
        "pasti",
        "settimana",
        "spesa",
        "cucina"
      ],
      "source": "richiesta",
      "request": "Un'app per pianificare i pasti della settimana con lista della spesa generata automaticamente",
      "status": "pronta",
      "version": 2,
      "changelog": [
        "v2 (2026-09-17): ridisegnata mobile-first con barra tab (Ricette/Piano/Spesa), piano a schede per giorno, palette terracotta e titoli serif"
      ],
      "design": {
        "layout": "tabs",
        "palette": "terracotta",
        "font": "serif-editoriale"
      },
      "business": null,
      "size": 25244
    },
    {
      "title": "Mance e Conto",
      "slug": "2026-09-17-mance-e-conto",
      "date": "2026-09-17",
      "description": "Mancia e quota a testa al ristorante in tre tocchi: conto, percentuale, persone. Arrotonda le quote e copia il riepilogo.",
      "category": "calcolatori-convertitori",
      "tags": [
        "mancia",
        "ristorante",
        "conto",
        "dividere"
      ],
      "source": "richiesta",
      "request": "Mance e Conto — calcola mancia e divisione del conto al ristorante in tre tocchi",
      "status": "pronta",
      "version": 2,
      "changelog": [
        "v2 (2026-09-17): layout telefono rifatto — eliminato l'overflow orizzontale (input e chip allargavano la pagina), pannello input non più fisso, quota a testa sempre in vista nella barra in basso con Copia e Azzera, chip mancia su griglia a 3 colonne."
      ],
      "design": {
        "layout": "split",
        "palette": "blu-notte",
        "font": "mono-tecnico"
      },
      "business": null,
      "size": 31407
    },
    {
      "title": "Dividi il Conto",
      "slug": "2026-09-17-dividi-il-conto",
      "date": "2026-09-17",
      "description": "Registra le spese di un gruppo e scopri chi deve dare quanto a chi, con il minimo numero di pagamenti.",
      "category": "finanza-personale",
      "tags": [
        "spese",
        "gruppo",
        "viaggio",
        "cena"
      ],
      "source": "autonoma",
      "request": null,
      "status": "pronta",
      "version": 3,
      "changelog": [
        "v2 (2026-09-17): adeguata alle regole mobile (target 44px, input 16px, safe-area, CSS mobile-first)",
        "v3 (2026-09-17): modello business — SEO (title, description, canonical, OG, JSON-LD), guida con esempio e FAQ, agganci monetizzazione, funzione Pro Esporta e stampa"
      ],
      "design": {
        "layout": "card-stack",
        "palette": "verde-bosco",
        "font": "sans-geometrico"
      },
      "business": {
        "keyword": "dividere le spese tra amici",
        "keywords": [
          "dividere le spese tra amici",
          "calcolo spese di gruppo",
          "chi deve dare quanto a chi",
          "dividere spese vacanza"
        ],
        "intent": "Chi torna da una cena o vacanza di gruppo e vuole sapere subito chi paga chi, senza registrarsi a un'app.",
        "target": "Gruppi di amici, coinquilini, famiglie in vacanza; 20-45 anni; da telefono.",
        "edge": "Zero registrazione, funziona offline, risultato in 30 secondi con il minimo numero di pagamenti, riepilogo pronto per WhatsApp.",
        "monetization": [
          "adsense",
          "pro",
          "support"
        ],
        "pro": [
          "Esporta e stampa"
        ],
        "affiliate": []
      },
      "size": 26959
    },
    {
      "title": "Bozza Rapida",
      "slug": "2026-09-17-bozza-rapida",
      "date": "2026-09-17",
      "description": "Appunti veloci a schede con ricerca istantanea (anche senza accenti), fissa in cima, copia, condividi, backup: tutto salvato sul telefono.",
      "category": "produttivita",
      "tags": [
        "appunti",
        "note",
        "ricerca",
        "testo"
      ],
      "source": "richiesta",
      "request": "Bozza Rapida — appunti veloci a schede con ricerca istantanea, salvati sul telefono",
      "status": "pronta",
      "version": 1,
      "changelog": [],
      "design": {
        "layout": "list-detail",
        "palette": "grigio-carta",
        "font": "serif-editoriale"
      },
      "business": null,
      "size": 31326
    }
  ]
};
