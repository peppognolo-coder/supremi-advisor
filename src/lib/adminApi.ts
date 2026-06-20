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
  tipo: string;
  codice_accesso: string | null;
  ubicazione: string | null;
  note: string | null;
  microonde: boolean;
  distributori: boolean;
  acqua: boolean;
  climatizzata: boolean;
}

export interface FasciaOraria {
  giorni: string[];
  apertura: string;
  chiusura: string;
}

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
}

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
  payload: { stazione: string; tipo?: string }
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('addSaletta', adminPin, payload);
}

export async function updateSaletta(
  adminPin: string,
  payload: {
    id: string; stazione: string; tipo: string;
    codice_accesso: string | null; ubicazione: string | null; note: string | null;
    microonde: boolean; distributori: boolean; acqua: boolean; climatizzata: boolean;
  }
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('updateSaletta', adminPin, payload as unknown as Record<string, unknown>);
}

export async function deleteSaletta(
  adminPin: string,
  id: string
): Promise<AdminApiResult<{ deleted: string }>> {
  return call<{ deleted: string }>('deleteSaletta', adminPin, { id });
}

// =============================================================
// ATTIVITA_STAZIONE
// =============================================================

export async function getAttivita(
  adminPin: string
): Promise<AdminApiResult<{ attivita: AttivitaRow[]; stazioni: StazioneRow[] }>> {
  return call<{ attivita: AttivitaRow[]; stazioni: StazioneRow[] }>('getAttivita', adminPin);
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

export async function updateAttivita(
  adminPin: string,
  payload: {
    id: string; nome: string; categoria: string;
    indirizzo: string | null; ubicazione: string | null; maps_query: string | null;
    distanza_piedi: string | null; convenzionato: boolean; note: string | null;
    fasce_orarie: FasciaOraria[];
  }
): Promise<AdminApiResult<AttivitaRow>> {
  return call<AttivitaRow>('updateAttivita', adminPin, payload as unknown as Record<string, unknown>);
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
): Promise<AdminApiResult<Contributo>> {
  return call<Contributo>('approveContributo', adminPin, { contributo: contributo as unknown as Record<string, unknown> });
}

export async function rejectContributo(
  adminPin: string,
  id: string
): Promise<AdminApiResult<Contributo>> {
  return call<Contributo>('rejectContributo', adminPin, { id });
}
