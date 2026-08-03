// =============================================================================
// Tipi allineati allo schema reale del database (generati con
// `supabase gen types typescript --project-id ...` e verificati a mano il
// 2026-08-03 — vedi conversazione).
//
// Questo file prima conteneva anche tabelle che non esistono più
// (locali, saletta_servizi, attivita_stazione_segnalazioni,
// saletta_segnalazioni) e campi con nomi/nullabilità sbagliati (es.
// "distanza" invece di "distanza_piedi", "regione"/"provincia"/"note"
// dichiarati obbligatori quando in realtà sono nullable) — è stata la
// causa di più bug scoperti e corretti in questa sessione. Ridotto al solo
// minimo realmente usato nel codice, per ridurre la superficie che può
// disallinearsi di nuovo in futuro.
//
// Per i tipi di Saletta/Attività "amministrativi" (usati dal pannello
// admin) la fonte di verità resta src/lib/adminApi.ts, già mantenuta
// aggiornata manualmente durante questa sessione — non duplicata qui.
// =============================================================================

// =========================
// STAZIONI
// =========================

export interface Stazione {
  id: string;
  nome: string;
  codice: string;
  regione: string | null;
  provincia: string | null;
  attiva: boolean | null;
  lat: number | null;
  lng: number | null;
  maps_query: string | null;
  plus_code: string | null;
  indirizzo: string | null;
  note: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// =========================
// ATTIVITÀ STAZIONE
// =========================

export interface FasciaOraria {
  giorni: string[];
  apertura: string;
  chiusura: string;
}

export interface AttivitaStazione {
  id: string;
  stazione_id: string | null;
  nome: string;
  categoria: string;
  // NOTA: il nome corretto della colonna è "distanza_piedi", non
  // "distanza" — la versione precedente di questo file aveva il nome
  // sbagliato (per fortuna mai letto da nessun punto del codice).
  distanza_piedi: string | null;
  ubicazione: string | null;
  indirizzo: string | null;
  maps_query: string | null;
  convenzionato: boolean | null;
  note: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
  fasce_orarie: FasciaOraria[] | null;
  dati_extra: Record<string, unknown> | null;
  qr_checkin_url: string | null;
  qr_scadenza: string | null;
  created_at?: string | null;
}

// =========================
// STAZIONE + ATTIVITÀ COLLEGATE
//
// Popolato in StazioniScreen.tsx unendo due query separate (stazioni +
// attivita_stazione filtrate per stazione_id), non un vero join — per
// questo qui c'è solo attivita_stazione, non anche le salette (mai lette
// da questa schermata: le salette hanno una loro schermata dedicata,
// SaletteScreen.tsx, col tipo SalettaPublic da adminApi.ts).
// =========================

export interface StazioneWithSalette extends Stazione {
  attivita_stazione: AttivitaStazione[];
}
