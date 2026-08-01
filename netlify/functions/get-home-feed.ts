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
      supabase.from('saletta_problemi').select('id, tipo_problema, stato, segnalazioni_count, created_at, updated_at, salette(stazione, tipo)')
        .in('stato', ['aperta', 'risolta']).order('updated_at', { ascending: false }).limit(20),
      supabase.from('stazioni').select('id, nome').eq('attiva', true),
      supabase.from('attivita_stazione').select('id, nome, stazione_id').eq('is_active', true),
      supabase.from('salette').select('id, stazione, tipo').eq('attiva', true),
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
        const stazioneNome = stazioniMap.get(dati.stazione_id) ?? dati.stazione ?? null;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info',
          titolo: `Nuova attività: ${dati.nome ?? 'senza nome'}`,
          descrizione: dati.categoria ? `Categoria: ${dati.categoria}` : 'Aggiunta alla stazione',
          stazione: stazioneNome ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: dati.stazione_id ? { tipo: 'stazione', stazioneId: dati.stazione_id, stazioneNome } : null,
        });
      } else if (c.tipo === 'stazione') {
        const match = (stazioniRes.data ?? []).find((s: any) => s.nome === dati.nome);
        items.push({
          id: `contrib-${c.id}`, tipo: 'info',
          titolo: `Nuova stazione: ${dati.nome ?? ''}`,
          descrizione: [dati.regione, dati.provincia].filter(Boolean).join(' · ') || 'Aggiunta al database',
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: match ? { tipo: 'stazione', stazioneId: match.id, stazioneNome: match.nome } : null,
        });
      } else if (c.tipo === 'saletta') {
        items.push({
          id: `contrib-${c.id}`, tipo: 'info',
          titolo: `Nuovo elemento: ${sezioneLabel(dati.tipo)}`,
          descrizione: dati.ubicazione ? `Ubicazione: ${dati.ubicazione}` : 'Aggiunto alla Località Operativa',
          stazione: dati.stazione ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: dati.stazione ? { tipo: 'salette', stazioneNome: dati.stazione } : null,
        });
      } else if (c.tipo === 'modifica_attivita') {
        const attivita = attivitaMap.get(dati.attivita_id);
        const stazioneNome = attivita ? stazioniMap.get(attivita.stazione_id) : null;
        const nCampi = dati.modifiche ? Object.keys(dati.modifiche).length : 0;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info',
          titolo: `Info aggiornate: ${dati.nome_attivita ?? attivita?.nome ?? 'attività'}`,
          descrizione: nCampi > 0 ? `${nCampi} informazion${nCampi === 1 ? 'e' : 'i'} aggiornat${nCampi === 1 ? 'a' : 'e'}` : 'Informazioni aggiornate',
          stazione: stazioneNome ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: attivita ? { tipo: 'stazione', stazioneId: attivita.stazione_id, stazioneNome } : null,
        });
      } else if (c.tipo === 'segnalazione_saletta') {
        const saletta = saletteMap.get(dati.saletta_id);
        const nSel = Array.isArray(dati.selezioni) ? dati.selezioni.length : 0;
        items.push({
          id: `contrib-${c.id}`, tipo: 'info',
          titolo: `Aggiornamento: ${sezioneLabel(saletta?.tipo ?? dati.sezione)}`,
          descrizione: nSel > 0 ? `${nSel} informazion${nSel === 1 ? 'e' : 'i'} aggiornat${nSel === 1 ? 'a' : 'e'}` : 'Informazioni aggiornate',
          stazione: saletta?.stazione ?? undefined,
          tempo: tempoFa(c.created_at), timestamp: c.created_at,
          link: saletta ? { tipo: 'salette', stazioneNome: saletta.stazione } : null,
        });
      }
    }

    // ── PROBLEMI SALETTE ─────────────────────────────────────────────────
    for (const p of problemiRes.data ?? []) {
      const saletta = (p as any).salette;
      if (p.stato === 'aperta') {
        items.push({
          id: `prob-${p.id}`, tipo: 'avviso',
          titolo: p.tipo_problema,
          descrizione: saletta ? `Segnalato nella ${sezioneLabel(saletta.tipo)}` : 'Segnalato di recente',
          stazione: saletta?.stazione ?? undefined,
          tempo: tempoFa(p.created_at), timestamp: p.created_at,
          link: saletta ? { tipo: 'salette', stazioneNome: saletta.stazione } : null,
        });
      } else if (p.stato === 'risolta') {
        items.push({
          id: `prob-${p.id}`, tipo: 'risolto',
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
