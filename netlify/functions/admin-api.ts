import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// =============================================================
// TIPI
// =============================================================

type Action =
  // SALETTE
  | 'getSalette'
  | 'addSaletta'
  | 'updateSaletta'
  | 'deleteSaletta'
  // ATTIVITA_STAZIONE
  | 'getAttivita'
  | 'softDeleteAttivita'
  | 'ripristinaAttivita'
  | 'updateAttivita'
  // CONTRIBUTI
  | 'getContributi'
  | 'updateContributoDati'
  | 'approveContributo'
  | 'rejectContributo';

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
  MISSING_PIN:        { code: 'MISSING_PIN',        message: 'PIN admin mancante.' },
  INVALID_PIN:        { code: 'INVALID_PIN',         message: 'PIN admin non valido.' },
  MISSING_ACTION:     { code: 'MISSING_ACTION',      message: 'Azione non specificata.' },
  UNKNOWN_ACTION:     { code: 'UNKNOWN_ACTION',      message: 'Azione non riconosciuta.' },
  MISSING_PAYLOAD:    { code: 'MISSING_PAYLOAD',     message: 'Payload mancante o incompleto.' },
  DB_ERROR:           { code: 'DB_ERROR',            message: 'Errore database.' },
  SERVER_ERROR:       { code: 'SERVER_ERROR',        message: 'Errore interno del server.' },
  METHOD_NOT_ALLOWED: { code: 'METHOD_NOT_ALLOWED',  message: 'Metodo HTTP non supportato.' },
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
// HELPER — normalizza group id saletta
// =============================================================

function normalizeGroupId(text: string): string {
  return text?.toLowerCase()?.trim()?.replaceAll(' ', '_') ?? '';
}

// =============================================================
// HELPER — ordina fasce orarie
// =============================================================

function ordinaFasce(fasce: unknown[]): unknown[] {
  return [...fasce].sort((a: any, b: any) => {
    const aAp = a.apertura || '';
    const bAp = b.apertura || '';
    return aAp.localeCompare(bAp);
  });
}

// =============================================================
// HANDLER
// =============================================================

export const handler: Handler = async (event: HandlerEvent) => {

  if (event.httpMethod !== 'POST') {
    return err(ERRORS.METHOD_NOT_ALLOWED, 405);
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return err(ERRORS.SERVER_ERROR, 400);
  }

  const { action, payload, adminPin } = body;

  // Verifica PIN
  if (!adminPin) return err(ERRORS.MISSING_PIN, 401);
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin || adminPin !== expectedPin) return err(ERRORS.INVALID_PIN, 401);

  // Verifica action
  if (!action) return err(ERRORS.MISSING_ACTION, 400);

  // Client Supabase con service_role key
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[admin-api] Variabili env mancanti');
    return err(ERRORS.SERVER_ERROR, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {

    // ============================================================
    // SALETTE
    // ============================================================

    if (action === 'getSalette') {
      const { data, error } = await supabase
        .from('salette')
        .select('*')
        .order('stazione', { ascending: true });
      if (error) return dbErr(error.message);
      return ok(data ?? []);
    }

    if (action === 'addSaletta') {
      const { stazione, tipo } = (payload ?? {}) as { stazione?: string; tipo?: string };
      if (!stazione?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stazione' });
      const { data, error } = await supabase
        .from('salette')
        .insert({ stazione: stazione.trim(), nome: stazione.trim(), tipo: tipo?.trim() || 'Equipaggi', stato: 'aperta' })
        .select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'updateSaletta') {
      const { id, stazione, tipo, codice_accesso, ubicazione, note, microonde, distributori, acqua, climatizzata } =
        (payload ?? {}) as any;
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('salette')
        .update({ stazione, tipo, codice_accesso: codice_accesso ?? null, ubicazione: ubicazione ?? null,
                  note: note ?? null, microonde: microonde ?? false, distributori: distributori ?? false,
                  acqua: acqua ?? false, climatizzata: climatizzata ?? false })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'deleteSaletta') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { error } = await supabase.from('salette').delete().eq('id', id);
      if (error) return dbErr(error.message);
      return ok({ deleted: id });
    }

    // ============================================================
    // ATTIVITA_STAZIONE
    // ============================================================

    if (action === 'getAttivita') {
      const { data: attivita, error: errAtt } = await supabase
        .from('attivita_stazione')
        .select('*')
        .order('nome', { ascending: true });
      if (errAtt) return dbErr(errAtt.message);

      const { data: stazioni, error: errSta } = await supabase
        .from('stazioni')
        .select('id,nome');
      if (errSta) return dbErr(errSta.message);

      return ok({ attivita: attivita ?? [], stazioni: stazioni ?? [] });
    }

    if (action === 'softDeleteAttivita') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('attivita_stazione')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'ripristinaAttivita') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('attivita_stazione')
        .update({ is_active: true, deleted_at: null })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'updateAttivita') {
      const { id, nome, categoria, indirizzo, ubicazione, maps_query,
              distanza_piedi, convenzionato, note, fasce_orarie } = (payload ?? {}) as any;
      if (!id)     return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!nome?.trim())     return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: nome' });
      if (!categoria?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: categoria' });
      const { data, error } = await supabase
        .from('attivita_stazione')
        .update({ nome: nome.trim(), categoria, indirizzo: indirizzo ?? null,
                  ubicazione: ubicazione ?? null, maps_query: maps_query ?? null,
                  distanza_piedi: distanza_piedi ?? null, convenzionato: convenzionato ?? false,
                  note: note ?? null, fasce_orarie: fasce_orarie ?? [] })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    // ============================================================
    // CONTRIBUTI
    // ============================================================

    if (action === 'getContributi') {
      const { data: contributi, error: errC } = await supabase
        .from('contributi')
        .select('*')
        .order('created_at', { ascending: false });
      if (errC) return dbErr(errC.message);

      const { data: stazioni, error: errS } = await supabase
        .from('stazioni')
        .select('id,nome');
      if (errS) return dbErr(errS.message);

      return ok({ contributi: contributi ?? [], stazioni: stazioni ?? [] });
    }

    if (action === 'updateContributoDati') {
      const { id, dati } = (payload ?? {}) as { id?: string; dati?: unknown };
      if (!id)   return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!dati) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: dati' });
      const { data, error } = await supabase
        .from('contributi')
        .update({ dati })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'approveContributo') {
      const { contributo } = (payload ?? {}) as { contributo?: any };
      if (!contributo?.id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: contributo' });

      const tipo = contributo.tipo;
      const dati = contributo.dati;

      // ------ SEGNALAZIONE SALETTA ------
      if (tipo === 'segnalazione_saletta') {
        const updatePayload: any = {};
        if (dati.tipo === 'codice_accesso' && dati.valore)   updatePayload.codice_accesso = dati.valore;
        else if (dati.tipo === 'ubicazione' && dati.valore)  updatePayload.ubicazione = dati.valore;
        else if (dati.tipo === 'note' && dati.valore)        updatePayload.note = dati.valore;
        else if (dati.tipo === 'climatizzata')               updatePayload.climatizzata = true;
        else if (dati.tipo === 'remove_climatizzata')        updatePayload.climatizzata = false;
        else if (dati.tipo === 'microonde')                  updatePayload.microonde = true;
        else if (dati.tipo === 'remove_microonde')           updatePayload.microonde = false;
        else if (dati.tipo === 'fontana_acqua')              updatePayload.acqua = true;
        else if (dati.tipo === 'remove_fontana_acqua')       updatePayload.acqua = false;
        else if (dati.tipo === 'distributori')               updatePayload.distributori = true;
        else if (dati.tipo === 'remove_distributori')        updatePayload.distributori = false;

        if (Object.keys(updatePayload).length > 0 && dati.saletta_id) {
          const { error } = await supabase.from('salette').update(updatePayload).eq('id', dati.saletta_id);
          if (error) return dbErr(error.message);
        }
      }

      // ------ SALETTA ------
      if (tipo === 'saletta') {
        const groupId = normalizeGroupId(dati.stazione);
        const { data: existing } = await supabase
          .from('salette').select('*')
          .eq('saletta_group_id', groupId).eq('tipo', dati.tipo).maybeSingle();

        if (existing) {
          const { error } = await supabase.from('salette')
            .update({ codice_accesso: dati.codice_accesso, ubicazione: dati.ubicazione, stato: dati.stato,
                      note: dati.note, microonde: dati.microonde, distributori: dati.distributori,
                      acqua: dati.acqua, climatizzata: dati.climatizzata })
            .eq('id', existing.id);
          if (error) return dbErr(error.message);
        } else {
          const { error } = await supabase.from('salette')
            .insert({ saletta_group_id: groupId, stazione: dati.stazione, nome: dati.stazione,
                      tipo: dati.tipo, codice_accesso: dati.codice_accesso, ubicazione: dati.ubicazione,
                      stato: dati.stato, note: dati.note, microonde: dati.microonde,
                      distributori: dati.distributori, acqua: dati.acqua, climatizzata: dati.climatizzata });
          if (error) return dbErr(error.message);
        }
      }

      // ------ ATTIVITA ------
      if (tipo === 'attivita') {
        const fasceSalvate = Array.isArray(dati.fasce_orarie) ? ordinaFasce(dati.fasce_orarie) : [];
        const { data: existing } = await supabase
          .from('attivita_stazione').select('id')
          .eq('stazione_id', dati.stazione_id).eq('nome', dati.nome).maybeSingle();

        if (existing) {
          const { error } = await supabase.from('attivita_stazione')
            .update({ categoria: dati.categoria, indirizzo: dati.indirizzo, maps_query: dati.maps_query,
                      distanza_piedi: dati.distanza_piedi, ubicazione: dati.ubicazione, note: dati.note,
                      convenzionato: dati.convenzionato, fasce_orarie: fasceSalvate })
            .eq('id', existing.id);
          if (error) return dbErr(error.message);
        } else {
          const { error } = await supabase.from('attivita_stazione')
            .insert({ stazione_id: dati.stazione_id, nome: dati.nome, categoria: dati.categoria,
                      indirizzo: dati.indirizzo, maps_query: dati.maps_query, distanza_piedi: dati.distanza_piedi,
                      ubicazione: dati.ubicazione, note: dati.note, convenzionato: dati.convenzionato,
                      fasce_orarie: fasceSalvate, is_active: true, deleted_at: null });
          if (error) return dbErr(error.message);
        }
      }

     // ------ STAZIONE ------
if (tipo === 'stazione') {

  const lat =
    dati.lat === '' ||
    dati.lat === undefined ||
    dati.lat === null
      ? null
      : Number(dati.lat);

  const lng =
    dati.lng === '' ||
    dati.lng === undefined ||
    dati.lng === null
      ? null
      : Number(dati.lng);

  // BLOCCO OBBLIGATORIO CODICE
  if (!dati.codice?.trim()) {
    return err({
      code: 'MISSING_STATION_CODE',
      message: 'Inserire il codice stazione prima dell’approvazione.',
    });
  }

  const { error } = await supabase
    .from('stazioni')
    .insert({
      nome: dati.nome?.trim() || null,
      codice: dati.codice?.trim() || null,
      regione: dati.regione?.trim() || null,
      provincia: dati.provincia?.trim() || null,
      maps_query: dati.maps_query?.trim() || null,
      lat,
      lng,
      note: dati.note?.trim() || null,
      indirizzo: dati.indirizzo?.trim() || null,
      plus_code: dati.plus_code?.trim() || null,
      attiva: true,
    });

  if (error) return dbErr(error.message);
}

      // Aggiorna stato contributo → approved
      const { data, error: statoError } = await supabase
        .from('contributi').update({ stato: 'approved' }).eq('id', contributo.id).select().single();
      if (statoError) return dbErr(statoError.message);
      return ok(data);
    }

    if (action === 'rejectContributo') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('contributi').update({ stato: 'rejected' }).eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    return err(ERRORS.UNKNOWN_ACTION, 400);

  } catch (e) {
    console.error('[admin-api] Errore inatteso:', e);
    return err(ERRORS.SERVER_ERROR, 500);
  }
};
