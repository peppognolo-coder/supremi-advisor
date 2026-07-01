import { useState, useEffect } from 'react';

import {
  Search,
  DoorOpen,
  MapPin,
  X,
  MessageSquarePlus,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import {
  getCurrentLocation,
  calculateDistance,
} from '../lib/location';

import { usePullToRefresh } from '../lib/usePullToRefresh';
import PullToRefreshVisualWrapper from '../components/PullToRefreshVisualWrapper';

import type {
  Saletta,
} from '../lib/database.types';

import SalettaCard from '../components/SalettaCard';

import LoadingSpinner from '../components/LoadingSpinner';

interface GroupedSaletta {
  stazione: string;
  salette: Saletta[];
  distanza?: number;
}

interface StazioneCoordinates {
  nome: string;
  lat: number;
  lng: number;
}

interface Props {
  refreshKey?: number;
  /** Callback invocata dal pull-to-refresh; tipicamente refreshApp di App.tsx. */
  onRefresh?: () => void;
  onNavigateToContributi?: () => void;
  /**
   * Se fornito, pre-popola la ricerca con il nome della stazione attiva.
   * Usato da Home → "Segnala problema" per contestualizzare la lista.
   * L'utente può cancellare con X per tornare alla lista completa.
   */
  initialStationName?: string | null;
}

export default function SaletteScreen({
  refreshKey = 0,
  onRefresh,
  onNavigateToContributi,
  initialStationName = null,
}: Props) {

  // SaletteScreen scrolla sul body: il PTR ascolta window.
  usePullToRefresh({ target: window, onRefresh: onRefresh ?? (() => {}) });

  // Dati grezzi raggruppati, SENZA distanza/ordinamento per posizione:
  // popolati appena le query rispondono, indipendentemente dal GPS.
  const [rawGrouped, setRawGrouped] = useState<GroupedSaletta[]>([]);
  const [stazioniCoordinates, setStazioniCoordinates] = useState<StazioneCoordinates[]>([]);

  // Vista derivata: rawGrouped + distanza/ordinamento applicati quando
  // disponibili. Quello che la UI consuma effettivamente.
  const [salette, setSalette] = useState<GroupedSaletta[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // =========================
  // PRE-POPOLA RICERCA
  // Eseguito solo al mount (o quando initialStationName cambia).
  // Non sovrascrive eventuali ricerche manuali successive.
  // =========================

  useEffect(() => {
    if (initialStationName) {
      setSearch(initialStationName);
    }
  }, [initialStationName]);

  // =========================
  // GEOLOCATION
  // Parte in parallelo al caricamento dati, non lo blocca più.
  // Quando risolve, aggiorna solo userLocation: il ricalcolo di
  // distanza/ordinamento avviene nell'effect dedicato più sotto,
  // senza rifare alcuna query Supabase.
  // =========================

  useEffect(() => {
    console.time('[SaletteScreen] getCurrentLocation (GPS)');
    async function initLocation() {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
      } catch {
        console.warn('Geolocalizzazione non disponibile');
      } finally {
        console.timeEnd('[SaletteScreen] getCurrentLocation (GPS)');
      }
    }
    initLocation();
  }, []);

  // =========================
  // LOAD
  // Parte subito al mount/refreshKey, senza aspettare la geolocation.
  // Popola i dati grezzi raggruppati; l'ordinamento per distanza viene
  // applicato a parte quando (e se) userLocation diventa disponibile.
  // =========================

  useEffect(() => {
    async function load() {
      setLoading(true);

      console.time('[SaletteScreen] Promise.all salette+stazioni');
      const [{ data, error }, { data: stazioniData }] = await Promise.all([
        supabase.from('salette').select('*'),
        supabase.from('stazioni').select('nome, lat, lng'),
      ]);
      console.timeEnd('[SaletteScreen] Promise.all salette+stazioni');

      if (error) {
        console.error(error);
        toast.error('Errore caricamento salette');
        setLoading(false);
        return;
      }

      console.time('[SaletteScreen] Mapping + group (senza distanza)');
      const coordinates: StazioneCoordinates[] =
        (stazioniData ?? []).filter((s) => s.lat && s.lng);

      const groupedMap = new Map<string, GroupedSaletta>();

      (data ?? []).forEach((saletta) => {
        const normalizedKey = saletta.stazione?.trim().toLowerCase();
        if (!groupedMap.has(normalizedKey)) {
          groupedMap.set(normalizedKey, { stazione: saletta.stazione, salette: [] });
        }
        groupedMap.get(normalizedKey)?.salette.push(saletta);
      });

      const grouped = Array.from(groupedMap.values());
      console.timeEnd('[SaletteScreen] Mapping + group (senza distanza)');

      console.time('[SaletteScreen] setRawGrouped (render trigger)');
      setStazioniCoordinates(coordinates);
      setRawGrouped(grouped);
      setLoading(false);
      console.timeEnd('[SaletteScreen] setRawGrouped (render trigger)');
    }

    load();
  }, [refreshKey]);

  // =========================
  // RICALCOLO DISTANZA + ORDINAMENTO
  // Eseguito quando i dati grezzi o la posizione cambiano. Non esegue
  // alcuna query: lavora solo sui dati già in memoria. Se userLocation
  // non è ancora disponibile, applica un ordinamento alfabetico.
  // =========================

  useEffect(() => {
    console.time('[SaletteScreen] Sort per distanza (derivato)');

    let sorted: GroupedSaletta[];

    if (userLocation) {
      sorted = rawGrouped.map((group) => {
        const first = group.salette[0];
        let lat = first?.lat;
        let lng = first?.lng;

        if ((!lat || !lng) && first?.stazione) {
          const stazioneMatch = stazioniCoordinates.find(
            (s) => s.nome?.trim().toLowerCase() === first.stazione?.trim().toLowerCase()
          );
          if (stazioneMatch) { lat = stazioneMatch.lat; lng = stazioneMatch.lng; }
        }

        let distanza: number | undefined;
        if (lat && lng) {
          distanza = calculateDistance(
            userLocation.lat, userLocation.lng, Number(lat), Number(lng)
          );
        }
        return { ...group, distanza };
      });

      sorted.sort((a, b) => {
        if (a.distanza != null && b.distanza != null) return a.distanza - b.distanza;
        if (a.distanza == null && b.distanza != null) return 1;
        if (a.distanza != null && b.distanza == null) return -1;
        return a.stazione.localeCompare(b.stazione, 'it');
      });
    } else {
      sorted = [...rawGrouped].sort((a, b) => a.stazione.localeCompare(b.stazione, 'it'));
    }

    setSalette(sorted);
    console.timeEnd('[SaletteScreen] Sort per distanza (derivato)');
  }, [rawGrouped, stazioniCoordinates, userLocation]);

  // =========================
  // SEARCH
  // =========================

  const filtered = salette.filter((group) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      group.stazione.toLowerCase().includes(q) ||
      group.salette.some((s) => s.tipo?.toLowerCase().includes(q))
    );
  });

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return <LoadingSpinner />;
  }

  // =========================
  // RENDER
  // =========================

  return (
    <div className="flex flex-col gap-4">

      {/* SEARCH — fuori dal wrapper per non essere soggetta al translateY */}
      <div className="sticky top-[110px] z-20 bg-gray-100 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca stazione o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-base"
          />
          {search.length > 0 && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Il wrapper avvolge solo la lista: il translateY non tocca la search bar */}
      <PullToRefreshVisualWrapper target={window}>

      {/* EMPTY */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <DoorOpen className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Nessuna saletta trovata</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">
              Nessun risultato per "{search}". La saletta non è ancora in elenco?
            </p>
          </div>
          <button
            onClick={() => setSearch('')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancella ricerca
          </button>
          {onNavigateToContributi && (
            <button
              onClick={onNavigateToContributi}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Segnala saletta mancante
            </button>
          )}
        </div>
      )}

      {/* LISTA */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((group, index) => (
            <div
              key={group.stazione}
              className={`rounded-3xl transition-all ${
                index === 0 ? 'ring-2 ring-trenord-green/20' : ''
              }`}
            >
              {index === 0 && group.distanza != null && (
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-xs font-semibold">
                  <MapPin className="w-3 h-3" />
                  Saletta più vicina
                  <span>• {group.distanza.toFixed(1)} km</span>
                </div>
              )}
              <SalettaCard
                stazioneName={group.stazione}
                salette={group.salette}
                initialExpanded={
                  !!initialStationName &&
                  group.stazione.toLowerCase() === initialStationName.toLowerCase()
                }
              />
            </div>
          ))}
        </div>
      )}

      </PullToRefreshVisualWrapper>

    </div>
  );
}