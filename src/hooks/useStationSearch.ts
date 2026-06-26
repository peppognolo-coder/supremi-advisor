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
        const { data, error } = await supabase
          .from('stazioni')
          .select('id, nome, codice, regione')
          .eq('attiva', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        if (!cancelled) setAllStations(data ?? []);
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

    if (tokens.length === 0) {
      // Nessuna query: mostra le prime 20 in ordine alfabetico
      return allStations.slice(0, 20);
    }

    return allStations.filter((s) => matchesQuery(s, tokens));
  }, [allStations, query]);

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