/**
 * get-home-feed
 *
 * Genera il feed "Da sapere" della home combinando:
 *   - contributi approvati di recente (nuove attività, stazioni, location,
 *     modifiche, segnalazioni saletta)
 *   - problemi salette aperti/risolti di recente
 *
 * Pubblica (nessun PIN), sola lettura. Usa la service role lato server
 * per evitare di dover verificare/assumere i permessi RLS per l'accesso
 * pubblico diretto a contributi/saletta_problemi — qui filtriamo e
 * restituiamo solo i campi già pensati per essere pubblici.
 *
 * GET, nessun parametro.
 * Response: { items: FeedItem[] }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function json(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Stesse 7 sezioni di src/lib/localitaSezioni.ts — duplicata qui in forma
// minimale (solo le etichette) per non importare componenti React/icone
// dentro una funzione serverless.
const SEZIONE_LABEL: Record<string, string> = {
  equipaggi: 'Saletta equipaggi',
  bagni: 'Bagni',
  cancelletto: 'Cancelletto',
  trenitalia: 'Locali Trenitalia',
  spogliatoi: 'Spogliatoi',
  segreteria: 'Segreteria',
  versamenti: 'Ufficio versamenti',
};

function sezioneLabel(id: string | null | undefined): string {
  return (id && SEZIONE_LABEL[id]) || id || 'Elemento';
}

function tempoFa(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minuti = Math.floor(diff / (1000 * 60));
  const ore    = Math.floor(minuti / 60);
  const gg     = Math.floor(ore / 24);
  if (gg > 0)     return `${gg} giorn${gg === 1 ? 'o' : 'i'} fa`;
  if (ore > 0)    return `${ore} or${ore === 1 ? 'a' : 'e'} fa`;
  if (minuti > 0) return `${minuti} minut${minuti === 1 ? 'o' : 'i'} fa`;
  return 'Poco fa';
}

interface FeedLink {
  tipo: 'stazione' | 'salette';
  stazioneId?: string;
  stazioneNome?: string;
}

interface FeedItem {
  id: string;
  tipo: 'info' | 'avviso' | 'risolto';
  categoria: 'nuova_attivita' | 'nuova_stazione' | 'nuovo_elemento' | 'modifica_attivita' | 'aggiornamento_saletta' | 'problema_aperto' | 'problema_risolto';
  titolo: string;
  descrizione: string;
  stazione?: string;
  tempo: string;
  timestamp: string;
  link: FeedLink | null;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const [contributiRes, problemiRes, stazioniRes, attivitaRes, saletteRes] = await Promise.all([
      supabase.from('contributi').select('id, tipo, dati, created_at')
        .eq('stato', 'approved').order('created_at', { ascending: false }).limit(30),
      supabase.from('saletta_problemi').select('id, tipo_problema, stato, segnalazioni_count, created_at, updated_at, salette(stazione, tipo, attiva, deleted_at)')
        .in('stato', ['aperta', 'risolta']).order('updated_at', { ascending: false }).limit(20),
      supabase.from('stazioni').select('id, nome').eq('attiva', true),
      supabase.from('attivita_stazione').select('id, nome, stazione_id').eq('is_active', true),
      supabase.from('salette').select('id, stazione, tipo').eq('attiva', true).is('deleted_at', null),
    ]);

    if (contributiRes.error) throw contributiRes.error;
    if (problemiRes.error) throw problemiRes.error;

    const stazioniMap = new Map((stazioniRes.data ?? []).map((s: any) => [s.id, s.nome]));
    const attivitaMap = new Map((attivitaRes.data ?? []).map((a: any) => [a.id, a]));
    const saletteMap  = new Map((saletteRes.data ?? []).map((s: any) => [s.id, s]));

    const items: FeedItem[] = [];

    // ── CONTRIBUTI APPROVATI ────────────────────────────────────────────
    for (const c of contributiRes.data ?? []) {
      const dati = (c.dati ?? {}) as Record<string, any>;

      if (c.tipo === 'attivita') {
        // dati.attivita_id è presente per i contributi approvati dopo
        // l'introduzione di questo controllo (vedi admin-api.ts). Se
        // presente, è la verifica affidabile: se l'attività non è più tra
        // quelle attive (cancellata o disattivata), la voce non deve
        // comparire nel feed. Per i contributi più vecchi (senza id
        // salvato) si ricade sul match per nome+stazione come prima, ma
        // se anche quello fallisce la voce viene comunque nascosta:
        // meglio una voce in meno che una voce "fantasma" con link rotto.
        if (dati.attivita_id) {
          if (!attivitaMap.has(dati.attivita_id)) continue;
        } else {
          const esisteAncora = (attivitaRes.data ?? []).some(
            (a: any) => a.nome === dati.nome && a.stazione_id === dati.stazione_id
          );
          if (!esisteAncora) continue;
        }

        const stazioneNome = stazioniMap.get(dati.stazione_id) ?? dati.stazione ?? null;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info', categoria: 'nuova_attivita',
          titolo: `Nuova attività: ${dati.nome ?? 'senza nome'}`,
          descrizione: dati.categoria ? `Categoria: ${dati.categoria}` : 'Aggiunta alla stazione',
          stazione: stazioneNome ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: dati.stazione_id ? { tipo: 'stazione', stazioneId: dati.stazione_id, stazioneNome } : null,
        });
      } else if (c.tipo === 'stazione') {
        // Stessa logica: dati.stazione_id (quando presente) è la verifica
        // affidabile; altrimenti fallback per nome sulle stazioni attive.
        const match = dati.stazione_id
          ? (stazioniRes.data ?? []).find((s: any) => s.id === dati.stazione_id)
          : (stazioniRes.data ?? []).find((s: any) => s.nome === dati.nome);
        if (!match) continue;

        items.push({
          id: `contrib-${c.id}`, tipo: 'info', categoria: 'nuova_stazione',
          titolo: `Nuova stazione: ${dati.nome ?? ''}`,
          descrizione: [dati.regione, dati.provincia].filter(Boolean).join(' · ') || 'Aggiunta al database',
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: { tipo: 'stazione', stazioneId: match.id, stazioneNome: match.nome },
        });
      } else if (c.tipo === 'saletta') {
        // Le salette vengono cancellate con hard delete (vedi deleteSaletta
        // in admin-api.ts): se dati.saletta_id non è più nella mappa delle
        // salette attive, l'elemento non esiste più — voce nascosta.
        if (dati.saletta_id && !saletteMap.has(dati.saletta_id)) continue;

        items.push({
          id: `contrib-${c.id}`, tipo: 'info', categoria: 'nuovo_elemento',
          titolo: `Nuovo elemento: ${sezioneLabel(dati.tipo)}`,
          descrizione: dati.ubicazione ? `Ubicazione: ${dati.ubicazione}` : 'Aggiunto alla Località Operativa',
          stazione: dati.stazione ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: dati.stazione ? { tipo: 'salette', stazioneNome: dati.stazione } : null,
        });
      } else if (c.tipo === 'modifica_attivita') {
        // L'attività modificata deve esistere ancora ed essere attiva,
        // altrimenti la voce "Info aggiornate" non ha più senso di esistere.
        const attivita = attivitaMap.get(dati.attivita_id);
        if (!attivita) continue;

        const stazioneNome = stazioniMap.get(attivita.stazione_id);
        const nCampi = dati.modifiche ? Object.keys(dati.modifiche).length : 0;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info', categoria: 'modifica_attivita',
          titolo: `Info aggiornate: ${dati.nome_attivita ?? attivita.nome ?? 'attività'}`,
          descrizione: nCampi > 0 ? `${nCampi} informazion${nCampi === 1 ? 'e' : 'i'} aggiornat${nCampi === 1 ? 'a' : 'e'}` : 'Informazioni aggiornate',
          stazione: stazioneNome ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: { tipo: 'stazione', stazioneId: attivita.stazione_id, stazioneNome },
        });
      } else if (c.tipo === 'segnalazione_saletta') {
        // Stesso ragionamento: la saletta segnalata deve esistere ancora.
        const saletta = saletteMap.get(dati.saletta_id);
        if (!saletta) continue;

        const nSel = Array.isArray(dati.selezioni) ? dati.selezioni.length : 0;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info', categoria: 'aggiornamento_saletta',
          titolo: `Aggiornamento: ${sezioneLabel(saletta.tipo ?? dati.sezione)}`,
          descrizione: nSel > 0 ? `${nSel} informazion${nSel === 1 ? 'e' : 'i'} aggiornat${nSel === 1 ? 'a' : 'e'}` : 'Informazioni aggiornate',
          stazione: saletta.stazione ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: { tipo: 'salette', stazioneNome: saletta.stazione },
        });
      }
    }

    // ── PROBLEMI SALETTE ─────────────────────────────────────────────────
    for (const p of problemiRes.data ?? []) {
      const saletta = (p as any).salette;

      // Se la saletta è stata disattivata (toggleAttivaSaletta) o eliminata
      // (deleteSaletta, soft delete via deleted_at) o non esiste più, il
      // problema segnalato non ha più senso di comparire nel feed.
      // Vedi migrazione 016 e conversazione.
      if (saletta && (saletta.attiva === false || saletta.deleted_at)) continue;

      if (p.stato === 'aperta') {
        items.push({
          id: `prob-${p.id}`, tipo: 'avviso', categoria: 'problema_aperto',
          titolo: p.tipo_problema,
          descrizione: saletta ? `Segnalato nella ${sezioneLabel(saletta.tipo)}` : 'Segnalato di recente',
          stazione: saletta?.stazione ?? undefined,
          tempo: tempoFa(p.created_at), timestamp: p.created_at,
          link: saletta ? { tipo: 'salette', stazioneNome: saletta.stazione } : null,
        });
      } else if (p.stato === 'risolta') {
        items.push({
          id: `prob-${p.id}`, tipo: 'risolto', categoria: 'problema_risolto',
          titolo: `Risolto: ${p.tipo_problema}`,
          descrizione: saletta ? `${sezioneLabel(saletta.tipo)} di nuovo regolare` : 'Problema risolto',
          stazione: saletta?.stazione ?? undefined,
          tempo: tempoFa(p.updated_at), timestamp: p.updated_at,
          link: saletta ? { tipo: 'salette', stazioneNome: saletta.stazione } : null,
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return json(200, { items: items.slice(0, 10) });

  } catch (err: any) {
    console.error('[get-home-feed]', err);
    return json(500, { error: 'Errore generazione feed', items: [] });
  }
};
