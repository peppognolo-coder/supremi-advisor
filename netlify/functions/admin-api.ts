import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// =============================================================
// TIPI
// =============================================================

type Action =
  | 'getSalette'
  | 'addSaletta'
  | 'updateSaletta'
  | 'deleteSaletta';

interface RequestBody {
  action: Action;
  payload?: Record<string, unknown>;
  adminPin: string;
}

interface AdminApiError {
  code: string;
  message: string;
}

interface AdminApiResponse {
  ok: boolean;
  data?: unknown;
  error?: AdminApiError;
}

// =============================================================
// ERRORI TIPIZZATI
// =============================================================

const ERRORS: Record<string, AdminApiError> = {
  MISSING_PIN:      { code: 'MISSING_PIN',      message: 'PIN admin mancante.' },
  INVALID_PIN:      { code: 'INVALID_PIN',       message: 'PIN admin non valido.' },
  MISSING_ACTION:   { code: 'MISSING_ACTION',    message: 'Azione non specificata.' },
  UNKNOWN_ACTION:   { code: 'UNKNOWN_ACTION',    message: 'Azione non riconosciuta.' },
  MISSING_PAYLOAD:  { code: 'MISSING_PAYLOAD',   message: 'Payload mancante o incompleto.' },
  DB_ERROR:         { code: 'DB_ERROR',          message: 'Errore database.' },
  SERVER_ERROR:     { code: 'SERVER_ERROR',      message: 'Errore interno del server.' },
  METHOD_NOT_ALLOWED: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo HTTP non supportato.' },
};

function ok(data: unknown): HandlerResponse {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, data } satisfies AdminApiResponse),
  };
}

function err(error: AdminApiError, status = 400): HandlerResponse {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, error } satisfies AdminApiResponse),
  };
}

function dbErr(detail: string): HandlerResponse {
  return err({ ...ERRORS.DB_ERROR, message: `Errore database: ${detail}` }, 500);
}

// =============================================================
// HANDLER
// =============================================================

export const handler: Handler = async (event: HandlerEvent) => {

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return err(ERRORS.METHOD_NOT_ALLOWED, 405);
  }

  // Parse body
  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return err(ERRORS.SERVER_ERROR, 400);
  }

  const { action, payload, adminPin } = body;

  // Verifica PIN
  if (!adminPin) {
    return err(ERRORS.MISSING_PIN, 401);
  }
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin || adminPin !== expectedPin) {
    return err(ERRORS.INVALID_PIN, 401);
  }

  // Verifica action
  if (!action) {
    return err(ERRORS.MISSING_ACTION, 400);
  }

  // Client Supabase con service_role key (mai esposta al browser)
  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[admin-api] Variabili env mancanti: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return err(ERRORS.SERVER_ERROR, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // =============================================================
  // AZIONI
  // =============================================================

  try {

    // ----------------------------------------------------------
    // getSalette — legge tutte le salette ordinate per stazione
    // ----------------------------------------------------------
    if (action === 'getSalette') {
      const { data, error } = await supabase
        .from('salette')
        .select('*')
        .order('stazione', { ascending: true });

      if (error) return dbErr(error.message);
      return ok(data ?? []);
    }

    // ----------------------------------------------------------
    // addSaletta — inserisce una nuova saletta
    // ----------------------------------------------------------
    if (action === 'addSaletta') {
      const { stazione, tipo } = (payload ?? {}) as {
        stazione?: string;
        tipo?: string;
      };

      if (!stazione?.trim()) {
        return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stazione' });
      }

      const { data, error } = await supabase
        .from('salette')
        .insert({
          stazione: stazione.trim(),
          nome:     stazione.trim(),
          tipo:     tipo?.trim() || 'Equipaggi',
          stato:    'aperta',
        })
        .select()
        .single();

      if (error) return dbErr(error.message);
      return ok(data);
    }

    // ----------------------------------------------------------
    // updateSaletta — aggiorna una saletta esistente per ID
    // ----------------------------------------------------------
    if (action === 'updateSaletta') {
      const {
        id, stazione, tipo, codice_accesso,
        ubicazione, note, microonde, distributori, acqua, climatizzata,
      } = (payload ?? {}) as {
        id?: string;
        stazione?: string;
        tipo?: string;
        codice_accesso?: string | null;
        ubicazione?: string | null;
        note?: string | null;
        microonde?: boolean;
        distributori?: boolean;
        acqua?: boolean;
        climatizzata?: boolean;
      };

      if (!id) {
        return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      }

      const { data, error } = await supabase
        .from('salette')
        .update({
          stazione,
          tipo,
          codice_accesso: codice_accesso ?? null,
          ubicazione:     ubicazione ?? null,
          note:           note ?? null,
          microonde:      microonde ?? false,
          distributori:   distributori ?? false,
          acqua:          acqua ?? false,
          climatizzata:   climatizzata ?? false,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return dbErr(error.message);
      return ok(data);
    }

    // ----------------------------------------------------------
    // deleteSaletta — elimina una saletta per ID
    // ----------------------------------------------------------
    if (action === 'deleteSaletta') {
      const { id } = (payload ?? {}) as { id?: string };

      if (!id) {
        return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      }

      const { error } = await supabase
        .from('salette')
        .delete()
        .eq('id', id);

      if (error) return dbErr(error.message);
      return ok({ deleted: id });
    }

    // Azione non riconosciuta
    return err(ERRORS.UNKNOWN_ACTION, 400);

  } catch (e) {
    console.error('[admin-api] Errore inatteso:', e);
    return err(ERRORS.SERVER_ERROR, 500);
  }
};
