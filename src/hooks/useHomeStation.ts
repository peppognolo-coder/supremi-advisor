import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Stazione } from '../lib/database.types';

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'home_active_station';

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface HomeStationCounts {
  salette: number;
  attivita: number;
  hotel: number;
}

export interface HomeStationProblema {
  id: string;
  tipo: string;
  nota: string | null;
  stato: string;
}

export interface HomeStationData {
  stazione: Stazione;
  counts: HomeStationCounts;
  problemiAperti: HomeStationProblema[];
}

// ---------------------------------------------------------------------------
// Helpers localStorage
// ---------------------------------------------------------------------------

function readPersistedId(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function persistId(id: string): void {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

function clearPersistedId(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHomeStation(refreshKey = 0) {
  const [activeStationId, setActiveStationId] = useState<string | null>(
    readPersistedId
  );

  const [data, setData] = useState<HomeStationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // Carica dati completi della stazione attiva
  // =========================================================================

  const loadStationData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: stazione, error: stazioneErr } = await supabase
        .from('stazioni')
        .select('*')
        .eq('id', id)
        .eq('attiva', true)
        .single();

      if (stazioneErr || !stazione) {
        clearPersistedId();
        setActiveStationId(null);
        setData(null);
        return;
      }

      const [saletteRes, attivitaRes, hotelRes] = await Promise.all([
        supabase
          .from('salette')
          .select('id', { count: 'exact', head: true })
          .eq('stazione_id', id)
          .neq('stato', 'chiusa'),
        supabase
          .from('attivita_stazione')
          .select('id', { count: 'exact', head: true })
          .eq('stazione_id', id)
          .eq('is_active', true)
          .neq('categoria', 'Hotel'),
        supabase
          .from('attivita_stazione')
          .select('id', { count: 'exact', head: true })
          .eq('stazione_id', id)
          .eq('is_active', true)
          .eq('categoria', 'Hotel'),
      ]);

      const counts: HomeStationCounts = {
        salette: saletteRes.count ?? 0,
        attivita: attivitaRes.count ?? 0,
        hotel: hotelRes.count ?? 0,
      };

      const { data: problemiRaw } = await supabase
        .from('saletta_segnalazioni')
        .select('id, tipo, nota, stato, salette!inner(stazione_id)')
        .eq('salette.stazione_id', id)
        .in('stato', ['aperta', 'in_carico'])
        .order('created_at', { ascending: false })
        .limit(5);

      const problemiAperti: HomeStationProblema[] = (problemiRaw ?? []).map(
        (p: any) => ({ id: p.id, tipo: p.tipo, nota: p.nota, stato: p.stato })
      );

      setData({ stazione, counts, problemiAperti });
    } catch (err) {
      console.error('[useHomeStation] Errore:', err);
      setError('Impossibile caricare i dati della stazione.');
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================================
  // Effetto: ricarica quando cambia stazione O quando refreshKey cambia
  // refreshKey viene incrementato dal pull-to-refresh globale di App.tsx
  // =========================================================================

  useEffect(() => {
    if (!activeStationId) {
      setData(null);
      setLoading(false);
      return;
    }
    loadStationData(activeStationId);
  }, [activeStationId, loadStationData, refreshKey]);

  // =========================================================================
  // Azioni
  // =========================================================================

  const setActiveStation = useCallback((id: string) => {
    persistId(id);
    setActiveStationId(id);
  }, []);

  const clearActiveStation = useCallback(() => {
    clearPersistedId();
    setActiveStationId(null);
    setData(null);
  }, []);

  const refresh = useCallback(() => {
    if (activeStationId) loadStationData(activeStationId);
  }, [activeStationId, loadStationData]);

  return {
    activeStationId,
    data,
    loading,
    error,
    setActiveStation,
    clearActiveStation,
    refresh,
  };
}