// =============================================================
// adminApi.ts
// Client frontend per /.netlify/functions/admin-api
// NON usa supabase direttamente — tutto passa dal server
// con SUPABASE_SERVICE_ROLE_KEY.
// =============================================================

// =============================================================
// TIPI CONDIVISI
// =============================================================

export interface AdminApiError {
  code: string;
  message: string;
}

export interface AdminApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: AdminApiError;
}

export interface Saletta {
  id: string;
  stazione: string;
  stazione_id: string | null;
  tipo: string;
  /** Distingue più righe della stessa sezione nella stessa stazione (es. "Trenord"/"Trenitalia"). */
  etichetta: string | null;
  codice_accesso: string | null;
  ubicazione: string | null;
  note: string | null;
  stato: string | null;
  modalita_accesso: string | null;
  tipologia_accesso: string | null;
  microonde: boolean;
  distributori: boolean;
  acqua: boolean;
  climatizzata: boolean;
  docce: boolean;
  armadietti: boolean;
  fasce_orarie: { giorni: string[]; apertura: string; chiusura: string }[] | null;
  attiva: boolean;
  /** Timestamp di eliminazione (soft delete). NULL = non eliminata. Indipendente da `attiva`. */
  deleted_at: string | null;
}

// Variante usata lato utente (SaletteScreen.tsx, SalettaCard.tsx): la query
// pubblica esclude sempre codice_accesso per sicurezza (non deve mai
// arrivare al client) ed espone invece has_codice, un booleano calcolato
// dal database (colonna generata, migration 015).
export type SalettaPublic = Omit<Saletta, 'codice_accesso'> & { has_codice?: boolean };

export interface FasciaOraria {
  giorni: string[];
  apertura: string;
  chiusura: string;
}

// NOTA: nonostante il nome, questo tipo descrive il contenuto generico
// della colonna jsonb dati_extra su attivita_stazione — condivisa tra
// categorie diverse. Per gli hotel contiene i campi hotel, per le
// categorie alimentari contiene opzioni_alimentari. Non l'ho rinominato
// per non generare un diff enorme su tutti i file che lo importano.
export interface HotelDatiExtra {
  telefono?: string | null;
  reception_h24?: boolean;
  colazione?: boolean;
  wifi?: boolean;
  navetta?: boolean;
  ristorante?: boolean;
  note_equipaggi?: string | null;
  opzioni_alimentari?: string[];
}

export const OPZIONI_ALIMENTARI = [
  { id: 'vegetariano',    label: 'Opzione vegetariana' },
  { id: 'vegano',         label: 'Opzione vegana' },
  { id: 'senza_glutine',  label: 'Senza glutine' },
] as const;

export type OpzioneAlimentareId = typeof OPZIONI_ALIMENTARI[number]['id'];

// Categorie per cui ha senso mostrare la sezione opzioni alimentari.
export const CATEGORIE_ALIMENTARI = ['Bar', 'Ristorante', 'Pizzeria', 'Market', 'Fast Food'];

export interface AttivitaRow {
  id: string;
  stazione_id: string;
  nome: string;
  categoria: string;
  indirizzo: string | null;
  ubicazione: string | null;
  maps_query: string | null;
  distanza_piedi: string | null;
  convenzionato: boolean;
  is_active: boolean;
  deleted_at: string | null;
  note: string | null;
  fasce_orarie: FasciaOraria[] | null;
  dati_extra: HotelDatiExtra | null;
  qr_checkin_url: string | null;
  qr_scadenza: string | null;
  created_at?: string;
}

export const CATEGORIE_ATTIVITA = [
  'Bar', 'Fast Food', 'Market', 'Ristorante', 'Pizzeria',
  'Farmacia', 'Tabacchi', 'Hotel', 'Altro',
] as const;

export const DISTANZE_ATTIVITA = [
  'In stazione',
  'Entro 2 minuti a piedi',
  'Entro 5 minuti a piedi',
  'Entro 10 minuti a piedi',
  'Oltre 10 minuti a piedi',
] as const;

export const TIPI_PROBLEMA_HOTEL = [
  'Pulizia insufficiente',
  'Camere rumorose',
  'Colazione scarsa',
  'Personale poco disponibile',
  'WiFi non funzionante',
  'Climatizzazione guasta',
  'Problemi nella camera',
  'Struttura deteriorata',
  'Navetta non disponibile',
  'Servizio navetta inaffidabile',
  'Informazioni non aggiornate',
  'Altro',
] as const;

export interface StazioneRow {
  id: string;
  nome: string;
}

export interface Contributo {
  id: string;
  tipo: string;
  dati: Record<string, unknown>;
  stato: string;
  created_at: string;
}

// =============================================================
// URL FUNCTION
// =============================================================

const FUNCTION_URL = '/.netlify/functions/admin-api';

// =============================================================
// HELPER INTERNO
// =============================================================

async function call<T>(
  action: string,
  adminPin: string,
  payload?: Record<string, unknown>
): Promise<AdminApiResult<T>> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminPin, payload }),
    });
    return await res.json() as AdminApiResult<T>;
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Errore di rete. Verifica la connessione.' } };
  }
}

// =============================================================
// SALETTE
// =============================================================

export async function getSalette(adminPin: string): Promise<AdminApiResult<Saletta[]>> {
  return call<Saletta[]>('getSalette', adminPin);
}

export async function addSaletta(
  adminPin: string,
  payload: { stazione_id: string; tipo: string; etichetta?: string }
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('addSaletta', adminPin, payload);
}

export async function updateSaletta(
  adminPin: string,
  payload: {
    id: string; stazione_id: string; tipo: string; etichetta?: string | null;
    codice_accesso: string | null; ubicazione: string | null; note: string | null;
    microonde: boolean; distributori: boolean; acqua: boolean; climatizzata: boolean;
    docce?: boolean; armadietti?: boolean;
    modalita_accesso?: string | null; tipologia_accesso?: string | null;
    fasce_orarie?: { giorni: string[]; apertura: string; chiusura: string }[] | null;
    stato?: string | null;
  }
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('updateSaletta', adminPin, payload as unknown as Record<string, unknown>);
}

export async function deleteSaletta(
  adminPin: string,
  id: string
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('deleteSaletta', adminPin, { id });
}

export async function ripristinaSaletta(
  adminPin: string,
  id: string
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('ripristinaSaletta', adminPin, { id });
}

export async function hardDeleteSaletta(
  adminPin: string,
  id: string
): Promise<AdminApiResult<{ deleted: string }>> {
  return call<{ deleted: string }>('hardDeleteSaletta', adminPin, { id });
}

export async function toggleAttivaSaletta(
  adminPin: string,
  id: string,
  attiva: boolean
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('toggleAttivaSaletta', adminPin, { id, attiva });
}

// =============================================================
// ATTIVITA_STAZIONE
// =============================================================

export async function getAttivita(
  adminPin: string
): Promise<AdminApiResult<{ attivita: AttivitaRow[]; stazioni: StazioneRow[] }>> {
  return call<{ attivita: AttivitaRow[]; stazioni: StazioneRow[] }>('getAttivita', adminPin);
}

export async function addAttivita(
  adminPin: string,
  payload: {
    stazione_id: string; nome: string; categoria: string;
    indirizzo?: string | null; maps_query?: string | null; distanza_piedi?: string | null;
    ubicazione?: string | null; note?: string | null; convenzionato?: boolean;
    fasce_orarie?: FasciaOraria[]; dati_extra?: HotelDatiExtra | null;
  }
): Promise<AdminApiResult<AttivitaRow>> {
  return call<AttivitaRow>('addAttivita', adminPin, payload as unknown as Record<string, unknown>);
}

export async function softDeleteAttivita(
  adminPin: string,
  id: string
): Promise<AdminApiResult<AttivitaRow>> {
  return call<AttivitaRow>('softDeleteAttivita', adminPin, { id });
}

export async function ripristinaAttivita(
  adminPin: string,
  id: string
): Promise<AdminApiResult<AttivitaRow>> {
  return call<AttivitaRow>('ripristinaAttivita', adminPin, { id });
}

export async function hardDeleteAttivita(
  adminPin: string,
  id: string
): Promise<AdminApiResult<{ deleted: string }>> {
  return call<{ deleted: string }>('hardDeleteAttivita', adminPin, { id });
}

export async function updateAttivita(
  adminPin: string,
  payload: {
    id: string;
    nome: string;
    categoria: string;
    indirizzo: string | null;
    ubicazione: string | null;
    maps_query: string | null;
    distanza_piedi: string | null;
    convenzionato: boolean;
    note: string | null;
    fasce_orarie: FasciaOraria[];
    dati_extra: HotelDatiExtra | null;
  }
): Promise<AdminApiResult<AttivitaRow>> {
  return call<AttivitaRow>(
    'updateAttivita',
    adminPin,
    payload as unknown as Record<string, unknown>
  );
}

// =============================================================
// CONTRIBUTI
// =============================================================

export async function getContributi(
  adminPin: string
): Promise<AdminApiResult<{ contributi: Contributo[]; stazioni: StazioneRow[] }>> {
  return call<{ contributi: Contributo[]; stazioni: StazioneRow[] }>('getContributi', adminPin);
}

export async function updateContributoDati(
  adminPin: string,
  id: string,
  dati: Record<string, unknown>
): Promise<AdminApiResult<Contributo>> {
  return call<Contributo>('updateContributoDati', adminPin, { id, dati });
}

export async function approveContributo(
  adminPin: string,
  contributo: Contributo
): Promise<AdminApiResult<Contributo & { attivita_id?: string }>> {
  return call<Contributo & { attivita_id?: string }>('approveContributo', adminPin, { contributo: contributo as unknown as Record<string, unknown> });
}

export async function rejectContributo(
  adminPin: string,
  id: string
): Promise<AdminApiResult<Contributo>> {
  return call<Contributo>('rejectContributo', adminPin, { id });
}

// =============================================================
// STAZIONI
// =============================================================

export interface StazioneCompleta {
  id: string;
  nome: string;
  codice: string | null;
  regione: string | null;
  provincia: string | null;
  indirizzo: string | null;
  maps_query: string | null;
  plus_code: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  attiva: boolean;
  created_at: string;
}

export async function getStazioni(
  adminPin: string
): Promise<AdminApiResult<StazioneCompleta[]>> {
  return call<StazioneCompleta[]>('getStazioni', adminPin);
}

export async function addStazione(
  adminPin: string,
  payload: {
    nome: string; codice?: string | null; regione?: string | null; provincia?: string | null;
    indirizzo?: string | null; maps_query?: string | null; plus_code?: string | null;
    lat?: number | null; lng?: number | null; note?: string | null;
  }
): Promise<AdminApiResult<StazioneCompleta>> {
  return call<StazioneCompleta>('addStazione', adminPin, payload as unknown as Record<string, unknown>);
}

export async function updateStazione(
  adminPin: string,
  payload: {
    id: string; nome: string; codice: string | null;
    regione: string | null; provincia: string | null;
    indirizzo: string | null; maps_query: string | null;
    plus_code: string | null; lat: number | null; lng: number | null;
    note: string | null; attiva: boolean;
  }
): Promise<AdminApiResult<StazioneCompleta>> {
  return call<StazioneCompleta>('updateStazione', adminPin, payload as unknown as Record<string, unknown>);
}

export async function toggleAttivaStazione(
  adminPin: string,
  id: string,
  attiva: boolean
): Promise<AdminApiResult<StazioneCompleta>> {
  return call<StazioneCompleta>('toggleAttivaStazione', adminPin, { id, attiva });
}

export async function hardDeleteStazione(
  adminPin: string,
  id: string
): Promise<AdminApiResult<{ deleted: string }>> {
  return call<{ deleted: string }>('hardDeleteStazione', adminPin, { id });
}

// =============================================================
// SALETTA_PROBLEMI
// =============================================================

export interface SalettaProblema {
  id: string;
  saletta_id: string;
  tipo_problema: string;
  note: string | null;
  stato: 'aperta' | 'in_carico' | 'risolta' | 'archiviata';
  segnalazioni_count: number;
  /** Sezione segnalata dall'utente al momento della segnalazione — può
      differire dal tipo della saletta collegata (vedi migration 021). */
  sezione: string | null;
  created_at: string;
  updated_at: string;
  salette?: {
    id: string;
    stazione: string;
    tipo: string;
    ubicazione: string | null;
  };
}

export const TIPI_PROBLEMA_SALETTA = [
  'Climatizzazione guasta',
  'Microonde guasto',
  'Distributori non funzionanti',
  'Fontana acqua guasta',
  'Bagni guasti',
  'Porta danneggiata',
  'Finestra danneggiata',
  'Sedie o tavoli rotti',
  'Saletta sporca',
  'Presenza insetti o animali',
  'Illuminazione guasta',
  'Altro',
] as const;

export async function getProblemiSalette(
  adminPin: string
): Promise<AdminApiResult<SalettaProblema[]>> {
  return call<SalettaProblema[]>('getProblemiSalette', adminPin);
}

export async function segnalaProblema(
  adminPin: string,
  saletta_id: string,
  tipo_problema: string,
  note?: string
): Promise<AdminApiResult<SalettaProblema & { _action: 'created' | 'incremented' }>> {
  // Usa la Function per la logica upsert server-side (incrementa se già esiste)
  return call<SalettaProblema & { _action: 'created' | 'incremented' }>(
    'segnalaProblema',
    adminPin,
    { saletta_id, tipo_problema, note }
  );
}

export async function aggiornaStatoProblema(
  adminPin: string,
  id: string,
  stato: SalettaProblema['stato']
): Promise<AdminApiResult<SalettaProblema>> {
  return call<SalettaProblema>('aggiornaStatoProblema', adminPin, { id, stato });
}

// =========================
// QR CHECK-IN HOTEL
// =========================

/**
 * Carica un nuovo QR di check-in per un hotel.
 * Chiama la Netlify Function upload-hotel-qr con PIN admin.
 */
export async function uploadQrHotel(
  adminPin: string,
  attivitaId: string,
  imageBase64: string,
  mimeType: string,
  scadenza?: string
): Promise<AdminApiResult<{ qr_checkin_url: string }>> {
  try {
    const res = await fetch('/.netlify/functions/upload-hotel-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPin, attivitaId, imageBase64, mimeType, scadenza }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: { code: 'UPLOAD_ERROR', message: data.error ?? 'Errore upload' } };
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Errore di rete' } };
  }
}
