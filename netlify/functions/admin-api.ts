import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { checkAdminPin } from './_shared/verifyAdminPin';

// =============================================================
// TIPI
// =============================================================

type Action =
  // SALETTE
  | 'getSalette'
  | 'addSaletta'
  | 'updateSaletta'
  | 'deleteSaletta'
  | 'ripristinaSaletta'
  | 'toggleAttivaSaletta'
  // ATTIVITA_STAZIONE
  | 'getAttivita'
  | 'addAttivita'
  | 'softDeleteAttivita'
  | 'ripristinaAttivita'
  | 'updateAttivita'
  // CONTRIBUTI
  | 'getContributi'
  | 'updateContributoDati'
  | 'approveContributo'
  | 'rejectContributo'
  // STAZIONI
  | 'getStazioni'
  | 'addStazione'
  | 'updateStazione'
  | 'toggleAttivaStazione'
  // SALETTA_PROBLEMI
  | 'getProblemiSalette'
  | 'segnalaProblema'
  | 'aggiornaStatoProblema';

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

  // Client Supabase con service_role key — costruito prima della verifica
  // PIN perché ora il controllo passa dal database (funzione SQL
  // verify_admin_pin), non più da una variabile d'ambiente.
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[admin-api] Variabili env mancanti');
    return err(ERRORS.SERVER_ERROR, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Verifica PIN — hash nel database (migration 018), mai in chiaro nel codice.
  if (!adminPin) return err(ERRORS.MISSING_PIN, 401);
  const pinValido = await checkAdminPin(supabase, adminPin);
  if (!pinValido) return err(ERRORS.INVALID_PIN, 401);

  // Verifica action
  if (!action) return err(ERRORS.MISSING_ACTION, 400);

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
      const { stazione_id, tipo, etichetta } = (payload ?? {}) as { stazione_id?: string; tipo?: string; etichetta?: string };
      if (!stazione_id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stazione_id' });
      if (!tipo)        return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: tipo (sezione)' });

      // Il nome testuale viene sempre derivato dalla stazione selezionata,
      // mai digitato a mano: garantisce che stazione_id e stazione (testo,
      // ancora usato per la visualizzazione) restino coerenti.
      const { data: staz, error: stazErr } = await supabase
        .from('stazioni').select('nome').eq('id', stazione_id).single();
      if (stazErr || !staz) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Stazione non trovata' });

      const { data, error } = await supabase
        .from('salette')
        .insert({ stazione_id, stazione: staz.nome, nome: staz.nome, tipo, etichetta: etichetta?.trim() || null, stato: 'aperta' })
        .select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'updateSaletta') {
      const {
        id, stazione_id, tipo, etichetta, codice_accesso, ubicazione, note,
        microonde, distributori, acqua, climatizzata, docce, armadietti,
        modalita_accesso, tipologia_accesso, fasce_orarie, stato,
      } = (payload ?? {}) as any;
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!stazione_id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stazione_id' });

      const { data: staz, error: stazErr } = await supabase
        .from('stazioni').select('nome').eq('id', stazione_id).single();
      if (stazErr || !staz) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Stazione non trovata' });

      const { data, error } = await supabase
        .from('salette')
        .update({ stazione_id, stazione: staz.nome, tipo, etichetta: etichetta?.trim() || null,
                  codice_accesso: codice_accesso ?? null, ubicazione: ubicazione ?? null,
                  note: note ?? null, microonde: microonde ?? false, distributori: distributori ?? false,
                  acqua: acqua ?? false, climatizzata: climatizzata ?? false,
                  docce: docce ?? false, armadietti: armadietti ?? false,
                  modalita_accesso: modalita_accesso ?? null, tipologia_accesso: tipologia_accesso ?? null,
                  fasce_orarie: Array.isArray(fasce_orarie) ? fasce_orarie : null,
                  stato: stato ?? null })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'deleteSaletta') {
      // Soft delete: campo dedicato deleted_at, indipendente da attiva
      // (che resta per la disattivazione temporanea via toggleAttivaSaletta).
      // Vedi migrazione 016 e conversazione.
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('salette')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'ripristinaSaletta') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('salette')
        .update({ deleted_at: null })
        .eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'toggleAttivaSaletta') {
      const { id, attiva } = (payload ?? {}) as { id?: string; attiva?: boolean };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('salette')
        .update({ attiva: attiva ?? true })
        .eq('id', id)
        .select()
        .single();
      if (error) return dbErr(error.message);
      return ok(data);
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

    if (action === 'addAttivita') {
      const p = (payload ?? {}) as any;
      if (!p.stazione_id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stazione_id' });
      if (!p.nome?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: nome' });
      if (!p.categoria)    return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: categoria' });

      const fasceSalvate = Array.isArray(p.fasce_orarie) ? ordinaFasce(p.fasce_orarie) : [];

      const { data, error } = await supabase
        .from('attivita_stazione')
        .insert({
          stazione_id:    p.stazione_id,
          nome:           p.nome.trim(),
          categoria:      p.categoria,
          indirizzo:      p.indirizzo ?? null,
          maps_query:     p.maps_query ?? null,
          distanza_piedi: p.distanza_piedi ?? null,
          ubicazione:     p.ubicazione ?? null,
          note:           p.note ?? null,
          convenzionato:  p.convenzionato ?? false,
          fasce_orarie:   fasceSalvate,
          is_active:      true,
          deleted_at:     null,
          dati_extra:     p.dati_extra ?? null,
        })
        .select().single();
      if (error) return dbErr(error.message);
      return ok(data);
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
              distanza_piedi, convenzionato, note, fasce_orarie, dati_extra } = (payload ?? {}) as any;
      if (!id)     return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!nome?.trim())     return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: nome' });
      if (!categoria?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: categoria' });
      const { data, error } = await supabase
        .from('attivita_stazione')
        .update({ nome: nome.trim(), categoria, indirizzo: indirizzo ?? null,
                  ubicazione: ubicazione ?? null, maps_query: maps_query ?? null,
                  distanza_piedi: distanza_piedi ?? null, convenzionato: convenzionato ?? false,
                  note: note ?? null, fasce_orarie: fasce_orarie ?? [],
                  dati_extra: dati_extra ?? null })
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

      // ------ HOTEL QR ------
      // L'upload dell'immagine su Storage avviene via Netlify Function upload-hotel-qr
      // al momento dell'approvazione in AdminContributiScreen.
      // Qui ci limitiamo ad accettare il contributo senza modificare attivita_stazione
      // (lo ha già fatto upload-hotel-qr).
      if (tipo === 'hotel_qr') {
        // Nessuna operazione DB aggiuntiva — upload già eseguito lato client admin
      }

      // ------ SEGNALAZIONE SALETTA ------
      if (tipo === 'segnalazione_saletta') {
        const updatePayload: any = {};

        // Applica una singola selezione {tipo, valore} al payload di update.
        function applicaSelezione(selTipo: string, valore: unknown) {
          if (selTipo === 'codice_accesso' && valore)   updatePayload.codice_accesso = valore;
          else if (selTipo === 'ubicazione' && valore)  updatePayload.ubicazione = valore;
          else if (selTipo === 'note' && valore)        updatePayload.note = valore;
          else if (selTipo === 'climatizzata')               updatePayload.climatizzata = true;
          else if (selTipo === 'remove_climatizzata')        updatePayload.climatizzata = false;
          else if (selTipo === 'microonde')                  updatePayload.microonde = true;
          else if (selTipo === 'remove_microonde')           updatePayload.microonde = false;
          else if (selTipo === 'fontana_acqua')              updatePayload.acqua = true;
          else if (selTipo === 'remove_fontana_acqua')       updatePayload.acqua = false;
          else if (selTipo === 'distributori')               updatePayload.distributori = true;
          else if (selTipo === 'remove_distributori')        updatePayload.distributori = false;
          // Le altre sezioni (bagni, cancelletto, trenitalia, spogliatoi,
          // segreteria, versamenti) non hanno colonne dedicate in salette:
          // restano visibili all'admin in fase di revisione ma non generano
          // un update automatico — stesso comportamento di prima.
        }

        // Formato nuovo: dati.selezioni = [{ tipo, valore }, ...] — più campi
        // segnalati in un unico contributo. Fallback al formato precedente
        // (dati.tipo singolo) per compatibilità coi contributi già in coda
        // prima di questo aggiornamento.
        if (Array.isArray(dati.selezioni)) {
          for (const sel of dati.selezioni as { tipo: string; valore?: unknown }[]) {
            applicaSelezione(sel.tipo, sel.valore);
          }
        } else if (dati.tipo) {
          applicaSelezione(dati.tipo as string, dati.valore);
        }

        if (Object.keys(updatePayload).length > 0 && dati.saletta_id) {
          const { error } = await supabase.from('salette').update(updatePayload).eq('id', dati.saletta_id);
          if (error) return dbErr(error.message);
        }
      }

      // ------ SALETTA ------
      // dati.stazione_id è valorizzato quando l'utente ha scelto la stazione
      // dall'elenco (caso comune). È assente/null quando ha usato "La mia
      // stazione non è in elenco" (testo libero) — in quel caso l'admin deve
      // averlo collegato manualmente in fase di revisione prima di approvare;
      // se arriva comunque null si ricade sul vecchio raggruppamento testuale
      // per non perdere il contributo.
      // salettaId viene catturato per essere salvato in dati.saletta_id
      // all'approvazione (vedi fondo funzione): serve al feed home per
      // verificare che la saletta esista/sia attiva ancora quando genera
      // le voci "Da sapere". Vedi conversazione.
      let salettaId: string | null = null;
      if (tipo === 'saletta') {
        // FIX: il form (ContributoSalettaForm.tsx) invia i servizi annidati
        // in dati.servizi.{microonde,distributori,acqua,climatizzata,docce,
        // armadietti} — prima qui si leggeva dati.microonde etc. al livello
        // sbagliato, quindi questi valori (e fasce_orarie/modalita_accesso/
        // tipologia_accesso, mai scritti affatto) venivano sempre persi
        // silenziosamente all'approvazione. Vedi conversazione.
        const servizi = (dati.servizi ?? {}) as Record<string, unknown>;
        const groupId = normalizeGroupId(dati.stazione);

        // L'etichetta entra nel match: due sale della stessa sezione nella
        // stessa stazione (es. "Trenord"/"Trenitalia") sono righe distinte,
        // non la stessa riga da sovrascrivere a vicenda.
        let query = supabase.from('salette').select('*')
          .eq('saletta_group_id', groupId).eq('tipo', dati.tipo);
        query = dati.etichetta
          ? query.eq('etichetta', dati.etichetta)
          : query.is('etichetta', null);
        const { data: existing } = await query.maybeSingle();

        const campiComuni = {
          stazione_id: dati.stazione_id ?? undefined,
          etichetta: dati.etichetta ?? null,
          codice_accesso: dati.codice_accesso ?? null,
          ubicazione: dati.ubicazione ?? null,
          stato: dati.stato ?? null,
          note: dati.note ?? null,
          modalita_accesso: dati.modalita_accesso ?? null,
          tipologia_accesso: dati.tipologia_accesso ?? null,
          fasce_orarie: Array.isArray(dati.fasce_orarie) ? dati.fasce_orarie : null,
          microonde: servizi.microonde ?? false,
          distributori: servizi.distributori ?? false,
          acqua: servizi.acqua ?? false,
          climatizzata: servizi.climatizzata ?? false,
          docce: servizi.docce ?? false,
          armadietti: servizi.armadietti ?? false,
        };

        if (existing) {
          const { error } = await supabase.from('salette')
            .update({ ...campiComuni, stazione_id: dati.stazione_id ?? existing.stazione_id ?? null })
            .eq('id', existing.id);
          if (error) return dbErr(error.message);
          salettaId = existing.id;
        } else {
          const { data: insertedSaletta, error } = await supabase.from('salette')
            .insert({ saletta_group_id: groupId, stazione: dati.stazione, nome: dati.stazione,
                      tipo: dati.tipo, ...campiComuni, stazione_id: dati.stazione_id ?? null,
                      deleted_at: null })
            .select('id')
            .single();
          if (error) return dbErr(error.message);
          salettaId = insertedSaletta?.id ?? null;
        }
      }

      // ------ ATTIVITA ------
      // attivitaId viene catturato per essere ritornato al client: serve quando
      // il contributo include un QR check-in (dati.qr_checkin_new) da caricare
      // subito dopo su Storage, tramite upload-hotel-qr, ora che l'attivita ha un id.
      let attivitaId: string | null = null;
      if (tipo === 'attivita') {
        const fasceSalvate = Array.isArray(dati.fasce_orarie) ? ordinaFasce(dati.fasce_orarie) : [];
        const { data: existing } = await supabase
          .from('attivita_stazione').select('id')
          .eq('stazione_id', dati.stazione_id).eq('nome', dati.nome).maybeSingle();

       if (existing) {
  const { error } = await supabase
    .from('attivita_stazione')
    .update({
      categoria: dati.categoria,
      indirizzo: dati.indirizzo,
      maps_query: dati.maps_query,
      distanza_piedi: dati.distanza_piedi,
      ubicazione: dati.ubicazione,
      note: dati.note,
      convenzionato: dati.convenzionato,
      fasce_orarie: fasceSalvate,
      dati_extra: dati.dati_extra ?? null
    })
    .eq('id', existing.id);

  if (error) return dbErr(error.message);
  attivitaId = existing.id;

} else {
  const { data: inserted, error } = await supabase
    .from('attivita_stazione')
    .insert({
      stazione_id: dati.stazione_id,
      nome: dati.nome,
      categoria: dati.categoria,
      indirizzo: dati.indirizzo,
      maps_query: dati.maps_query,
      distanza_piedi: dati.distanza_piedi,
      ubicazione: dati.ubicazione,
      note: dati.note,
      convenzionato: dati.convenzionato,
      fasce_orarie: fasceSalvate,
      is_active: true,
      deleted_at: null,
      dati_extra: dati.dati_extra ?? null
    })
    .select('id')
    .single();

  if (error) return dbErr(error.message);
  attivitaId = inserted?.id ?? null;
}
      }

      // ------ MODIFICA ATTIVITA ------
      // Proposta di modifica a un'attività esistente (vedi conversazione:
      // ProponiModificaAttivitaModal.tsx). dati.modifiche contiene solo i
      // campi realmente cambiati, ciascuno come { prima, dopo }: qui si
      // applica solo il "dopo" ai campi coinvolti, il resto dell'attività
      // resta intoccato.
      // Se l'attività è stata eliminata nel frattempo, l'update non trova
      // righe da aggiornare: non è un errore bloccante, il contributo viene
      // comunque marcato come approvato (nessuna modifica applicabile).
      if (tipo === 'modifica_attivita') {
        const modifiche = (dati.modifiche ?? {}) as Record<string, { prima: unknown; dopo: unknown }>;
        const updatePayload: Record<string, unknown> = {};
        for (const [campo, { dopo }] of Object.entries(modifiche)) {
          updatePayload[campo] = dopo;
        }

        if (Object.keys(updatePayload).length > 0 && dati.attivita_id) {
          const { error } = await supabase
            .from('attivita_stazione')
            .update(updatePayload)
            .eq('id', dati.attivita_id);
          if (error) return dbErr(error.message);
        }
      }

      // ------ STAZIONE ------
      // stazioneId viene catturato per lo stesso motivo di salettaId/attivitaId
      // sopra: permette al feed home di verificare che la stazione esista/sia
      // attiva ancora, invece di fare affidamento solo sul nome. Vedi conversazione.
      let stazioneId: string | null = null;
      if (tipo === 'stazione') {
        const { data: insertedStazione, error } = await supabase.from('stazioni')
          .insert({ nome: dati.nome, codice: dati.codice, regione: dati.regione, provincia: dati.provincia,
                    maps_query: dati.maps_query, lat: dati.lat ?? null, lng: dati.lng ?? null,
                    note: dati.note, indirizzo: dati.indirizzo ?? null, plus_code: dati.plus_code ?? null,
                    attiva: true })
          .select('id')
          .single();
        if (error) return dbErr(error.message);
        stazioneId = insertedStazione?.id ?? null;
      }

      // Salva nei dati del contributo l'id dell'entità creata/toccata da
      // questa approvazione (attivita_id / saletta_id / stazione_id).
      // Da qui in poi ogni contributo approvato porta con sé un riferimento
      // affidabile e verificabile: il feed home lo usa per capire se
      // l'entità esiste/è ancora attiva quando genera le voci "Da sapere",
      // invece di doverla ricercare per nome (fragile). Vedi conversazione.
      const datiAggiornati = {
        ...dati,
        ...(attivitaId ? { attivita_id: attivitaId } : {}),
        ...(salettaId ? { saletta_id: salettaId } : {}),
        ...(stazioneId ? { stazione_id: stazioneId } : {}),
      };

      // Aggiorna stato contributo → approved (+ dati aggiornati con l'id dell'entità)
      const { data, error: statoError } = await supabase
        .from('contributi')
        .update({ stato: 'approved', dati: datiAggiornati })
        .eq('id', contributo.id).select().single();
      if (statoError) return dbErr(statoError.message);
      return ok(attivitaId ? { ...data, attivita_id: attivitaId } : data);
    }

    if (action === 'rejectContributo') {
      const { id } = (payload ?? {}) as { id?: string };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('contributi').update({ stato: 'rejected' }).eq('id', id).select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }


    // ============================================================
    // STAZIONI
    // ============================================================

    if (action === 'getStazioni') {
      const { data, error } = await supabase
        .from('stazioni')
        .select('*')
        .order('nome', { ascending: true });
      if (error) return dbErr(error.message);
      return ok(data ?? []);
    }

    if (action === 'addStazione') {
      const p = (payload ?? {}) as any;
      if (!p.nome?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: nome' });

      const { data, error } = await supabase
        .from('stazioni')
        .insert({
          nome:       p.nome.trim(),
          codice:     p.codice || null,
          regione:    p.regione || null,
          provincia:  p.provincia || null,
          indirizzo:  p.indirizzo || null,
          maps_query: p.maps_query || null,
          plus_code:  p.plus_code || null,
          lat:        p.lat ?? null,
          lng:        p.lng ?? null,
          note:       p.note || null,
          attiva:     true,
        })
        .select().single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'updateStazione') {
      const {
        id, nome, codice, regione, provincia,
        indirizzo, maps_query, plus_code, lat, lng, note, attiva,
      } = (payload ?? {}) as any;
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!nome?.trim()) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: nome' });
      const { data, error } = await supabase
        .from('stazioni')
        .update({
          nome:       nome.trim(),
          codice:     codice?.trim() || null,
          regione:    regione?.trim() || null,
          provincia:  provincia?.trim() || null,
          indirizzo:  indirizzo?.trim() || null,
          maps_query: maps_query?.trim() || null,
          plus_code:  plus_code?.trim() || null,
          lat:        lat !== undefined && lat !== '' ? Number(lat) : null,
          lng:        lng !== undefined && lng !== '' ? Number(lng) : null,
          note:       note?.trim() || null,
          attiva:     attiva ?? true,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    if (action === 'toggleAttivaStazione') {
      const { id, attiva } = (payload ?? {}) as { id?: string; attiva?: boolean };
      if (!id) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      const { data, error } = await supabase
        .from('stazioni')
        .update({ attiva: attiva ?? true })
        .eq('id', id)
        .select()
        .single();
      if (error) return dbErr(error.message);
      return ok(data);
    }


    // ============================================================
    // SALETTA_PROBLEMI
    // ============================================================

    if (action === 'getProblemiSalette') {
      // Carica tutti i problemi con join salette per avere stazione e tipo
      const { data, error } = await supabase
        .from('saletta_problemi')
        .select('*, salette(id, stazione, tipo, ubicazione)')
        .order('updated_at', { ascending: false });
      if (error) return dbErr(error.message);
      return ok(data ?? []);
    }

    if (action === 'segnalaProblema') {
      // Upsert: se esiste già un problema aperto della stessa saletta e tipo,
      // incrementa segnalazioni_count e aggiorna updated_at
      const { saletta_id, tipo_problema, note } =
        (payload ?? {}) as { saletta_id?: string; tipo_problema?: string; note?: string };

      if (!saletta_id)    return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: saletta_id' });
      if (!tipo_problema) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: tipo_problema' });

      // Cerca problema aperto esistente
      const { data: existing } = await supabase
        .from('saletta_problemi')
        .select('id, segnalazioni_count')
        .eq('saletta_id', saletta_id)
        .eq('tipo_problema', tipo_problema)
        .eq('stato', 'aperta')
        .maybeSingle();

      if (existing) {
        // Incrementa contatore
        const { data, error } = await supabase
          .from('saletta_problemi')
          .update({
            segnalazioni_count: existing.segnalazioni_count + 1,
            note: note ?? existing.note ?? null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) return dbErr(error.message);
        return ok({ ...data, _action: 'incremented' });
      } else {
        // Crea nuovo problema
        const { data, error } = await supabase
          .from('saletta_problemi')
          .insert({ saletta_id, tipo_problema, note: note ?? null, stato: 'aperta', segnalazioni_count: 1 })
          .select()
          .single();
        if (error) return dbErr(error.message);
        return ok({ ...data, _action: 'created' });
      }
    }

    if (action === 'aggiornaStatoProblema') {
      const { id, stato } =
        (payload ?? {}) as { id?: string; stato?: string };

      if (!id)    return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: id' });
      if (!stato) return err({ ...ERRORS.MISSING_PAYLOAD, message: 'Campo obbligatorio: stato' });

      const validStati = ['aperta', 'in_carico', 'risolta', 'archiviata'];
      if (!validStati.includes(stato)) {
        return err({ ...ERRORS.MISSING_PAYLOAD, message: `Stato non valido: ${stato}` });
      }

      const { data, error } = await supabase
        .from('saletta_problemi')
        .update({ stato })
        .eq('id', id)
        .select()
        .single();
      if (error) return dbErr(error.message);
      return ok(data);
    }

    return err(ERRORS.UNKNOWN_ACTION, 400);

  } catch (e) {
    console.error('[admin-api] Errore inatteso:', e);
    return err(ERRORS.SERVER_ERROR, 500);
  }
};
