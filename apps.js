// GENERATO da tools/build.mjs — non modificare a mano.
window.__APPS__ = {
  "repo": "https://github.com/capozzoligiofra/app-al-giorno",
  "count": 7,
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
      "title": "Costo Viaggio in Auto",
      "slug": "2026-09-19-costo-viaggio-auto",
      "date": "2026-09-19",
      "description": "Calcola quanto costa un viaggio in auto: distanza tra città, carburante ai prezzi regionali, pedaggi e usura, diviso per persona.",
      "category": "calcolatori-convertitori",
      "tags": [
        "viaggio",
        "auto",
        "carburante",
        "pedaggi",
        "vacanze"
      ],
      "source": "richiesta",
      "request": "Costo Viaggio in Auto — keyword: \"calcolo costo viaggio auto\" — pianificazione vacanze, affiliazione naturale (accessori auto); Pro: confronto auto vs treno",
      "status": "pronta",
      "version": 2,
      "changelog": [
        "v2 (2026-09-19): distanza stimata automaticamente da partenza e arrivo (elenco offline di 170+ località, linea d'aria × 1,2) con link 'Verifica su Google Maps'; prezzi carburante sostituiti con le medie regionali MIMIT del 19/09/2026 e selettore regione (i vecchi 1,75/1,68 erano fuori di 40+ cent); km di autostrada proposti dal percorso; nuove Pro: Itinerario a tappe e Stampa preventivo PDF; guida e FAQ aggiornate."
      ],
      "design": {
        "layout": "dashboard",
        "palette": "nero-neon",
        "font": "sans-geometrico"
      },
      "business": {
        "keyword": "calcolo costo viaggio auto",
        "keywords": [
          "quanto costa un viaggio in auto",
          "costo benzina viaggio",
          "calcolo carburante e pedaggi",
          "conviene auto o treno",
          "distanza in auto tra città"
        ],
        "intent": "Chi sta organizzando un viaggio o una vacanza e vuole sapere subito quanto spende in auto, quanto tocca a testa e se conviene rispetto al treno.",
        "target": "Famiglie e gruppi di amici che pianificano vacanze e weekend, pendolari occasionali; 25-55 anni; da telefono.",
        "edge": "Basta scrivere partenza e arrivo: distanza stimata offline, prezzo medio del carburante della regione (fonte MIMIT), pedaggio dai km di autostrada, usura al km, extra, diviso a persona; senza registrazione né API; Pro: itinerario a tappe, confronto auto vs treno, viaggi salvati, preventivo PDF.",
        "monetization": [
          "adsense",
          "affiliate",
          "pro",
          "support"
        ],
        "pro": [
          "Itinerario a tappe",
          "Confronto auto vs treno",
          "Viaggi salvati",
          "Stampa preventivo PDF"
        ],
        "affiliate": [
          {
            "t": "Supporto smartphone per auto",
            "q": "supporto smartphone auto bocchetta"
          },
          {
            "t": "Caricatore USB da auto",
            "q": "caricatore auto usb c rapido"
          },
          {
            "t": "Compressore portatile per gomme",
            "q": "compressore portatile auto gomme"
          }
        ]
      },
      "size": 70073
    },
    {
      "title": "Lista Valigia",
      "slug": "2026-09-18-lista-valigia",
      "date": "2026-09-18",
      "description": "Genera la lista della valigia su misura per durata, clima e tipo di viaggio, con le quantità già calcolate.",
      "category": "produttivita",
      "tags": [
        "viaggio",
        "valigia",
        "checklist",
        "vacanza"
      ],
      "source": "richiesta",
      "request": "Lista Valigia — checklist per il viaggio generata da durata, clima e tipo di viaggio",
      "status": "pronta",
      "version": 1,
      "changelog": [],
      "design": {
        "layout": "wizard",
        "palette": "azzurro-cielo",
        "font": "condensed"
      },
      "business": {
        "keyword": "cosa mettere in valigia",
        "keywords": [
          "lista valigia",
          "lista cose da portare in vacanza",
          "checklist valigia mare",
          "cosa portare in viaggio lista"
        ],
        "intent": "Chi sta per partire e vuole subito una lista concreta e personalizzata da spuntare dal telefono, non l'ennesimo articolo da leggere.",
        "target": "Chi parte per vacanza o trasferta, 25-55 anni, prepara la valigia dal telefono la sera prima.",
        "edge": "Nessuno genera la lista: tutti pubblicano la stessa lista fissa per chiunque. Qui tre domande producono solo le voci pertinenti con le quantità calcolate su giorni, clima, bucato e persone, spuntabili e salvate offline.",
        "monetization": [
          "adsense",
          "affiliate",
          "pro",
          "support"
        ],
        "pro": [
          "Più viaggi salvati",
          "Stampa e scarica la lista"
        ],
        "affiliate": [
          {
            "t": "Organizer / cubi da valigia",
            "q": "organizer valigia set cubi"
          },
          {
            "t": "Bilancia digitale per bagagli",
            "q": "bilancia digitale bagagli"
          },
          {
            "t": "Set contenitori da viaggio 100 ml",
            "q": "contenitori da viaggio 100 ml set"
          },
          {
            "t": "Adattatore di corrente universale",
            "q": "adattatore universale viaggio"
          }
        ]
      },
      "size": 56086
    },
    {
      "title": "Timer Pasta",
      "slug": "2026-09-17-timer-pasta",
      "date": "2026-09-17",
      "description": "Tempi di cottura di 37 formati di pasta, timer a tutto schermo con avviso sonoro, dosi di acqua e sale e cottura passiva.",
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
      "version": 2,
      "changelog": [
        "v2 (2026-09-18): modello business — keyword \"tempi di cottura pasta\", SEO (title, description, canonical, OG, JSON-LD WebApplication e FAQPage), tabella completa di 37 formati cliccabile, guida con esempi e FAQ, dosi con grammi a testa regolabili, agganci di monetizzazione, funzioni Pro Cottura passiva e I miei formati"
      ],
      "design": {
        "layout": "fullscreen-tool",
        "palette": "giallo-senape",
        "font": "rounded"
      },
      "business": {
        "keyword": "tempi di cottura pasta",
        "keywords": [
          "tempi di cottura pasta",
          "quanti minuti cuocere la pasta",
          "timer pasta al dente",
          "quanta acqua e sale per la pasta",
          "cottura passiva pasta"
        ],
        "intent": "Ha già l'acqua sul fuoco e vuole sapere in tre secondi quanti minuti cuocere quel formato, con un timer che suoni da solo.",
        "target": "Chi cucina a casa tutti i giorni, 20-55 anni, dal telefono appoggiato al piano con le mani occupate.",
        "edge": "Tabella dei tempi e timer nella stessa pagina: tocchi il formato nella tabella e il conto alla rovescia è già pronto, con dosi di acqua e sale, avviso sonoro e cottura passiva. Offline, senza registrazione.",
        "monetization": [
          "adsense",
          "affiliate",
          "pro",
          "support"
        ],
        "pro": [
          "Cottura passiva",
          "I miei formati"
        ],
        "affiliate": [
          {
            "t": "Pentola alta per la pasta con coperchio",
            "q": "pentola alta pasta con coperchio"
          },
          {
            "t": "Coperchio universale (serve per la cottura passiva)",
            "q": "coperchio universale pentole"
          },
          {
            "t": "Sale grosso marino da cucina",
            "q": "sale grosso marino cucina"
          }
        ]
      },
      "size": 71394
    },
    {
      "title": "Piano dei Pasti",
      "slug": "2026-09-17-piano-dei-pasti",
      "date": "2026-09-17",
      "description": "Menu settimanale con i tuoi piatti e lista della spesa generata in automatico, con le quantità già sommate.",
      "category": "casa-cucina",
      "tags": [
        "menu settimanale",
        "spesa",
        "pasti",
        "cucina"
      ],
      "source": "richiesta",
      "request": "Un'app per pianificare i pasti della settimana con lista della spesa generata automaticamente",
      "status": "pronta",
      "version": 3,
      "changelog": [
        "v2 (2026-09-17): ridisegnata mobile-first con barra tab (Ricette/Piano/Spesa), piano a schede per giorno, palette terracotta e titoli serif",
        "v3 (2026-09-19): modello business — keyword \"menu settimanale con lista della spesa\", SEO (title, description, canonical, OG, JSON-LD WebApplication e FAQPage), guida con esempio e FAQ, agganci monetizzazione, funzioni Pro Settimane salvate e Menù/lista da stampare"
      ],
      "design": {
        "layout": "tabs",
        "palette": "terracotta",
        "font": "serif-editoriale"
      },
      "business": {
        "keyword": "menu settimanale con lista della spesa",
        "keywords": [
          "menu settimanale con lista della spesa",
          "menù settimanale famiglia",
          "pianificare i pasti della settimana",
          "lista della spesa settimanale",
          "menu settimanale da stampare"
        ],
        "intent": "Chi la domenica vuole decidere pranzi e cene della settimana e uscire con una lista della spesa già pronta, senza inventarsi un menu altrui.",
        "target": "Famiglie e coppie che cucinano in casa, 25-55 anni, da telefono mentre fanno la spesa.",
        "edge": "Il menu si costruisce con i piatti che cucini davvero e la lista della spesa somma da sola le quantità degli stessi ingredienti: nel browser, senza account, anche offline.",
        "monetization": [
          "adsense",
          "affiliate",
          "pro",
          "support"
        ],
        "pro": [
          "Più settimane salvate",
          "Menù e lista da stampare"
        ],
        "affiliate": [
          {
            "t": "Contenitori per meal prep in vetro",
            "q": "contenitori meal prep vetro con coperchio"
          },
          {
            "t": "Lavagna magnetica per il frigorifero",
            "q": "lavagna magnetica frigorifero lista spesa"
          },
          {
            "t": "Borsa termica per la spesa",
            "q": "borsa termica spesa grande"
          }
        ]
      },
      "size": 42973
    },
    {
      "title": "Mance e Conto",
      "slug": "2026-09-17-mance-e-conto",
      "date": "2026-09-17",
      "description": "Quanto lasciare di mancia al ristorante e quanto viene a testa: conto, percentuale, persone. Con arrotondamento e usanze paese per paese.",
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
      "version": 3,
      "changelog": [
        "v2 (2026-09-17): layout telefono rifatto — eliminato l'overflow orizzontale (input e chip allargavano la pagina), pannello input non più fisso, quota a testa sempre in vista nella barra in basso con Copia e Azzera, chip mancia su griglia a 3 colonne.",
        "v3 (2026-09-18): convertita al modello business — keyword \"quanto lasciare di mancia\", title/description/canonical/OG/JSON-LD (WebApplication + FAQPage), guida di oltre 600 parole con esempio numerico, usanze estere e FAQ, chip \"usanza del posto\" (6 paesi) che impostano la percentuale tipica, segnaposto data-ad/data-support e due funzioni Pro reali: quote personalizzate (mancia ripartita in proporzione al consumo) e storico dei conti salvati."
      ],
      "design": {
        "layout": "split",
        "palette": "blu-notte",
        "font": "mono-tecnico"
      },
      "business": {
        "keyword": "quanto lasciare di mancia",
        "keywords": [
          "calcolo mancia ristorante",
          "dividere il conto al ristorante",
          "quanto si lascia di mancia in america",
          "come si calcola il 10 per cento di mancia"
        ],
        "intent": "Sei al tavolo con il conto in mano e vuoi sapere subito quanto lasciare e quanto mettere a testa, senza fare i conti a mente davanti al cameriere.",
        "target": "Chi mangia fuori in gruppo e chi viaggia all'estero e non conosce l'usanza del posto, 20-55 anni, quasi sempre da telefono.",
        "edge": "Risponde con un numero, non con un articolo: percentuali italiane vere, arrotondamento per eccesso della quota a testa (l'abitudine che i tool tradotti dall'inglese ignorano), usanze di 6 paesi offline, riepilogo da incollare in chat. Niente account.",
        "monetization": [
          "adsense",
          "pro",
          "support"
        ],
        "pro": [
          "Quote personalizzate",
          "Storico dei conti"
        ],
        "affiliate": []
      },
      "size": 59251
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
      "description": "Blocco note online senza registrazione: più appunti a schede, ricerca istantanea anche senza accenti, tutto salvato sul dispositivo.",
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
      "version": 2,
      "changelog": [
        "v2 (2026-09-19): modello business — keyword \"blocco note online senza registrazione\", SEO (title, description, canonical, OG, JSON-LD WebApplication e FAQPage), guida con esempio e FAQ, agganci monetizzazione, funzioni Pro Esporta e stampa e Cronologia delle versioni; la pagina ora scorre (tool in alto, guida sotto) e il dettaglio è a tutto schermo su telefono"
      ],
      "design": {
        "layout": "list-detail",
        "palette": "grigio-carta",
        "font": "serif-editoriale"
      },
      "business": {
        "keyword": "blocco note online senza registrazione",
        "keywords": [
          "blocco note online",
          "blocco note online gratis",
          "appunti veloci online",
          "scrivere note nel browser senza account"
        ],
        "intent": "Chi deve annotare o ritrovare qualcosa adesso dal browser — un codice, un indirizzo, una lista — e non vuole creare un account né installare un'app.",
        "target": "Chi lavora o studia con il telefono in mano, 18-55 anni: appunti al volo in negozio, in ufficio, in viaggio.",
        "edge": "Più appunti veri e non una casella unica, ricerca istantanea che ignora maiuscole e accenti, appunti fissati in cima, backup esportabile: tutto senza account e senza che il testo esca dal dispositivo.",
        "monetization": [
          "adsense",
          "pro",
          "support"
        ],
        "pro": [
          "Esporta e stampa",
          "Cronologia delle versioni"
        ],
        "affiliate": []
      },
      "size": 53858
    }
  ]
};
