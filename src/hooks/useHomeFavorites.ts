import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getFavorites, toggleFavorite } from '../lib/favorites';

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface FavoriteStationSummary {
  id: string;
  nome: string;
  codice: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHomeFavorites(activeStationId: string | null) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [stations, setStations] = useState<FavoriteStationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // Leggi gli ID preferiti dal localStorage
  // =========================================================================

  useEffect(() => {
    setFavoriteIds(getFavorites());
  }, []);

  // =========================================================================
  // Carica i dati delle stazioni preferite da Supabase
  // =========================================================================

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setStations([]);
      return;
    }

    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('stazioni')
          .select('id, nome, codice')
          .in('id', favoriteIds)
          .eq('attiva', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        if (!cancelled) {
          // Preserva l'ordine dei preferiti (prima quelli salvati per primi)
          const ordered = favoriteIds
            .map((id) => (data ?? []).find((s) => s.id === id))
            .filter((s): s is FavoriteStationSummary => !!s);
          setStations(ordered);
        }
      } catch (err) {
        console.error('[useHomeFavorites] Errore caricamento preferiti:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFavorites();
    return () => { cancelled = true; };
  }, [favoriteIds]);

  // =========================================================================
  // Toggle preferito
  // =========================================================================

  const toggle = useCallback((stationId: string) => {
    const updated = toggleFavorite(stationId);
    setFavoriteIds(updated);
  }, []);

  return {
    /** Lista ordinata delle stazioni preferite con dati completi */
    favoriteStations: stations,
    /** ID attualmente nei preferiti */
    favoriteIds,
    loading,
    toggle,
  };
}