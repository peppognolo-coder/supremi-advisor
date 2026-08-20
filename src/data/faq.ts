// =============================================================================
// FAQ — contenuti statici
//
// Perché hardcoded e non su Supabase: le domande cambiano raramente e c'è un
// solo sviluppatore a curarle. Se in futuro servisse editarle senza redeploy
// (o affidarle a più persone), valutare la migrazione a una tabella `faq`
// con lo stesso pattern usato per salette/attivita (deleted_at, attiva, ecc).
//
// Per aggiungere una domanda: individua la categoria giusta qui sotto (o
// creane una nuova) e aggiungi un oggetto { id, domanda, risposta } all'array
// `items`. L'id deve essere univoco nell'intero file (usato come React key).
// =============================================================================

export interface FaqItem {
  id: string;
  domanda: string;
  risposta: string;
}

export interface FaqCategoria {
  id: string;
  titolo: string;
  items: FaqItem[];
}

export const faqData: FaqCategoria[] = [
  {
    id: 'salette',
    titolo: 'Salette',
    items: [
      {
        id: 'salette-trova',
        domanda: 'Come trovo la saletta di una stazione?',
        risposta:
          "Apri la scheda Salette dalla barra in basso, oppure cerca direttamente la stazione dalla Home. Se la stazione ha una saletta disponibile, la trovi nella sua scheda con tutte le informazioni utili.",
      },
      {
        id: 'salette-codice-fisso',
        domanda: 'Il codice di accesso della saletta cambia ogni volta?',
        risposta:
          "No. Il codice di accesso della saletta è fisso e resta lo stesso finché non viene aggiornato manualmente (ad esempio in caso di cambio serratura). Quello che cambia è il codice a 6 cifre generato dalla tua app Authenticator, che serve solo per sbloccare temporaneamente la visualizzazione del codice fisso — non è il codice della saletta stesso.",
      },
      {
        id: 'salette-authenticator',
        domanda: "Come configuro l'app Authenticator per vedere il codice?",
        risposta:
          "La prima volta che apri il codice di una saletta, l'app ti guida nella configurazione: scarichi Google Authenticator (o un'app equivalente) e scansioni il QR code mostrato a schermo. Da quel momento l'app Authenticator genera un codice a 6 cifre che cambia ogni 30 secondi: inseriscilo in Supremi Advisor per sbloccare la visualizzazione del codice fisso della saletta. La configurazione va fatta una sola volta per dispositivo.",
      },
      {
        id: 'salette-non-disponibile',
        domanda: "Perché una saletta risulta 'non disponibile' anche se dovrebbe essere aperta?",
        risposta:
          "Le salette possono essere disattivate temporaneamente per manutenzione o altri motivi organizzativi. Una saletta disattivata tornerà visibile appena riattivata: se il problema persiste, usa 'Segnala problema' dalla scheda della saletta.",
      },
    ],
  },
  {
    id: 'stazioni',
    titolo: 'Stazioni & attività',
    items: [
      {
        id: 'stazioni-cerca',
        domanda: 'Come cerco una stazione specifica?',
        risposta:
          "Usa la barra di ricerca in Home o la scheda Stazioni: puoi cercare per nome e vedere subito bar, hotel, farmacie e altri servizi disponibili nei dintorni.",
      },
      {
        id: 'stazioni-preferita',
        domanda: 'Come imposto la mia stazione abituale?',
        risposta:
          "Dalla Home, tocca 'Seleziona la tua stazione' e cerca quella che usi più spesso. Una volta impostata, la Home mostrerà sempre le sue informazioni in primo piano.",
      },
    ],
  },
  {
    id: 'contributi',
    titolo: 'Contributi & segnalazioni',
    items: [
      {
        id: 'contributi-cosa',
        domanda: 'Cosa significa "Nuovo contributo"?',
        risposta:
          "È il modo in cui puoi aiutare a mantenere aggiornate le informazioni dell'app: segnalare un nuovo bar, correggere un orario, aggiungere una convenzione, e altro. Ogni contributo viene revisionato prima di essere pubblicato.",
      },
      {
        id: 'contributi-problema',
        domanda: 'Come segnalo un problema con una saletta o un\'attività?',
        risposta:
          "Usa 'Segnala problema' dalla Home o dalla scheda della saletta/stazione interessata. Descrivi il problema: verrà inoltrato agli amministratori per la verifica.",
      },
      {
        id: 'contributi-tempi',
        domanda: 'Quanto tempo ci vuole prima che un contributo venga approvato?',
        risposta:
          "Dipende dalla disponibilità degli amministratori, ma di norma i contributi vengono revisionati entro pochi giorni. Non riceverai una notifica automatica quando viene approvato: la modifica comparirà semplicemente nell'app.",
      },
    ],
  },
  {
    id: 'generale',
    titolo: 'Generale',
    items: [
      {
        id: 'generale-tema',
        domanda: 'Come cambio il tema chiaro/scuro?',
        risposta:
          "Tocca l'icona sole/luna in alto nella Home (o nella barra superiore nelle altre schermate). La scelta resta salvata sul tuo dispositivo.",
      },
      {
        id: 'generale-contatti',
        domanda: 'A chi scrivo per problemi tecnici o suggerimenti sull\'app?',
        risposta: 'Scrivi a supremiadvisor@gmail.com: leggiamo tutte le segnalazioni.',
      },
    ],
  },
];
