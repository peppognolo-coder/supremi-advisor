import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Stazione } from '../lib/database.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizza una stringa per la ricerca:
 * - lowercase
 * - trim
 * - rimuove accenti (é→e, à→a, ecc.)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ricerca multi-token: tutti i token della query devono essere presenti
 * nel nome O nel codice della stazione (AND tra parole, OR tra campi).
 *
 * Esempi:
 *   "porta gari"  → ["porta","gari"] → entrambi in "Milano Porta Garibaldi" ✅
 *   "garibaldi"   → ["garibaldi"]    → in nome ✅
 *   "centrale"    → ["centrale"]     → in nome ✅
 *   "mrog"        → ["mrog"]         → in codice ✅
 *   "bres"        → ["bres"]         → in nome (Brescia) ✅
 *   "greco"       → ["greco"]        → in nome (Milano Greco Pirelli) ✅
 */
function matchesQuery(
  station: Pick<Stazione, 'nome' | 'codice'>,
  tokens: string[]
): boolean {
  if (tokens.length === 0) return true;
  const nome = normalize(station.nome);
  const codice = normalize(station.codice);
  return tokens.every((token) => nome.includes(token) || codice.includes(token));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStationSearch() {
  const [allStations, setAllStations] = useState<
    Pick<Stazione, 'id' | 'nome' | 'codice' | 'regione'>[]
  >([]);
  // Id delle stazioni che hanno almeno una saletta attiva/non eliminata:
  // usato per decidere se mostrare il chip "Vedi salette" accanto al
  // risultato. Vedi conversazione.
  const [stazioniConSalette, setStazioniConSalette] = useState<Set<string>>(new Set());
  const [loadingAll, setLoadingAll] = useState(false);
  const [query, setQuery] = useState('');

  // =========================================================================
  // Carica tutte le stazioni attive (una volta sola al mount)
  // =========================================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingAll(true);
      try {
        const [stazioniRes, saletteRes] = await Promise.all([
          supabase
            .from('stazioni')
            .select('id, nome, codice, regione')
            .eq('attiva', true)
            .order('nome', { ascending: true }),
          supabase
            .from('salette')
            .select('stazione_id')
            .eq('attiva', true)
            .is('deleted_at', null),
        ]);

        if (stazioniRes.error) throw stazioniRes.error;
        if (saletteRes.error) throw saletteRes.error;

        if (!cancelled) {
          setAllStations(stazioniRes.data ?? []);
          setStazioniConSalette(
            new Set(
              (saletteRes.data ?? [])
                .map((s) => s.stazione_id)
                .filter((id): id is string => !!id)
            )
          );
        }
      } catch (err) {
        console.error('[useStationSearch] Errore caricamento stazioni:', err);
      } finally {
        if (!cancelled) setLoadingAll(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================================
  // Filtra con ricerca multi-token
  // =========================================================================

  const results = useMemo(() => {
    const tokens = normalize(query)
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const base =
      tokens.length === 0
        // Nessuna query: mostra tutte le stazioni attive in ordine alfabetico.
        // Prima limitava alle prime 20, costringendo a usare sempre la
        // ricerca anche per chi preferisce scorrere l'elenco — inutile con
        // solo 64 stazioni totali. Vedi conversazione.
        ? allStations
        : allStations.filter((s) => matchesQuery(s, tokens));

    return base.map((s) => ({
      ...s,
      hasSalette: stazioniConSalette.has(s.id),
    }));
  }, [allStations, query, stazioniConSalette]);

  const reset = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    loadingAll,
    reset,
  };
}
