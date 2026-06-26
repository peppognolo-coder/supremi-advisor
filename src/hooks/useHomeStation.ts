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
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silently ignore — non è critico
  }
}

function clearPersistedId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHomeStation() {
  const [activeStationId, setActiveStationId] = useState<string | null>(
    readPersistedId
  );

  const [data, setData] = useState<HomeStationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // Carica i dati completi della stazione attiva
  // =========================================================================

  const loadStationData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // --- 1. Dati stazione -----------------------------------------------
      const { data: stazione, error: stazioneErr } = await supabase
        .from('stazioni')
        .select('*')
        .eq('id', id)
        .eq('attiva', true)
        .single();

      if (stazioneErr || !stazione) {
        // La stazione non esiste più o non è attiva — reset
        clearPersistedId();
        setActiveStationId(null);
        setData(null);
        return;
      }

      // --- 2. Conteggi in parallelo ----------------------------------------
      const [saletteRes, attivitaRes, hotelRes] = await Promise.all([
        // Salette non chiuse
        supabase
          .from('salette')
          .select('id', { count: 'exact', head: true })
          .eq('stazione_id', id)
          .neq('stato', 'chiusa'),

        // Attività attive, escludendo Hotel
        supabase
          .from('attivita_stazione')
          .select('id', { count: 'exact', head: true })
          .eq('stazione_id', id)
          .eq('is_active', true)
          .neq('categoria', 'Hotel'),

        // Solo Hotel
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

      // --- 3. Problemi aperti (via JOIN salette → saletta_segnalazioni) -----
      // saletta_segnalazioni.saletta_id → salette.id → salette.stazione_id
      const { data: problemiRaw } = await supabase
        .from('saletta_segnalazioni')
        .select('id, tipo, nota, stato, salette!inner(stazione_id)')
        .eq('salette.stazione_id', id)
        .in('stato', ['aperta', 'in_carico'])
        .order('created_at', { ascending: false })
        .limit(5);

      const problemiAperti: HomeStationProblema[] = (problemiRaw ?? []).map(
        (p: any) => ({
          id: p.id,
          tipo: p.tipo,
          nota: p.nota,
          stato: p.stato,
        })
      );

      setData({ stazione, counts, problemiAperti });
    } catch (err) {
      console.error('[useHomeStation] Errore caricamento:', err);
      setError('Impossibile caricare i dati della stazione.');
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================================
  // Effetto: carica quando cambia l'ID attivo
  // =========================================================================

  useEffect(() => {
    if (!activeStationId) {
      setData(null);
      setLoading(false);
      return;
    }
    loadStationData(activeStationId);
  }, [activeStationId, loadStationData]);

  // =========================================================================
  // Azione: imposta stazione attiva
  // =========================================================================

  const setActiveStation = useCallback((id: string) => {
    persistId(id);
    setActiveStationId(id);
  }, []);

  // =========================================================================
  // Azione: deseleziona stazione attiva
  // =========================================================================

  const clearActiveStation = useCallback(() => {
    clearPersistedId();
    setActiveStationId(null);
    setData(null);
  }, []);

  // =========================================================================
  // Azione: refresh manuale
  // =========================================================================

  const refresh = useCallback(() => {
    if (activeStationId) {
      loadStationData(activeStationId);
    }
  }, [activeStationId, loadStationData]);

  return {
    /** ID della stazione attiva (null se nessuna selezionata) */
    activeStationId,
    /** Dati completi: stazione + conteggi + problemi aperti */
    data,
    loading,
    error,
    /** Imposta e persiste la stazione attiva */
    setActiveStation,
    /** Rimuove la stazione attiva */
    clearActiveStation,
    /** Ricarica i dati senza cambiare stazione */
    refresh,
  };
}