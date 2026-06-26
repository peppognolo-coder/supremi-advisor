import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Stazione } from '../lib/database.types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStationSearch() {
  const [allStations, setAllStations] = useState<
    Pick<Stazione, 'id' | 'nome' | 'codice' | 'regione'>[]
  >([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // =========================================================================
  // Carica tutte le stazioni attive (una volta sola)
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
        console.error('[useStationSearch] Errore:', err);
      } finally {
        if (!cancelled) setLoadingAll(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // =========================================================================
  // Filtra in base alla query
  // =========================================================================

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStations.slice(0, 20); // prime 20 se nessuna query
    return allStations.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        s.codice.toLowerCase().includes(q)
    );
  }, [allStations, query]);

  const reset = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    loadingAll,
    inputRef,
    reset,
  };
}