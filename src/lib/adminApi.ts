// =============================================================
// adminApi.ts
// Client frontend per la Netlify Function /.netlify/functions/admin-api
//
// NON usa supabase direttamente — tutte le operazioni admin
// passano dal server con SUPABASE_SERVICE_ROLE_KEY.
// =============================================================

// =============================================================
// TIPI
// =============================================================

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

export interface AdminApiError {
  code: string;
  message: string;
}

export interface AdminApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: AdminApiError;
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

    const json = await res.json() as AdminApiResult<T>;
    return json;
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Errore di rete. Verifica la connessione.',
      },
    };
  }
}

// =============================================================
// SALETTE
// =============================================================

/** Legge tutte le salette ordinate per stazione. */
export async function getSalette(adminPin: string): Promise<AdminApiResult<Saletta[]>> {
  return call<Saletta[]>('getSalette', adminPin);
}

/** Aggiunge una nuova saletta. */
export async function addSaletta(
  adminPin: string,
  payload: { stazione: string; tipo?: string }
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('addSaletta', adminPin, payload);
}

/** Aggiorna una saletta esistente. */
export async function updateSaletta(
  adminPin: string,
  payload: {
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
): Promise<AdminApiResult<Saletta>> {
  return call<Saletta>('updateSaletta', adminPin, payload as unknown as Record<string, unknown>);
}

/** Elimina una saletta per ID. */
export async function deleteSaletta(
  adminPin: string,
  id: string
): Promise<AdminApiResult<{ deleted: string }>> {
  return call<{ deleted: string }>('deleteSaletta', adminPin, { id });
}
