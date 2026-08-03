import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';

import type { Tab } from '../types';
import type { HomeStationData } from '../hooks/useHomeStation';

import { useHomeFavorites } from '../hooks/useHomeFavorites';
import { getHomeFeed } from '../lib/homeFeed';
import SceltaSegnalazioneModal from '../components/SceltaSegnalazioneModal';

import {
  StazioneCard,
  QuickActions,
  FavoriteStations,
  UpdateFeed,
  FeedItem,
  SearchBar,
} from '../components/home';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeScreenProps {
  // Navigazione
  onNavigate: (tab: Tab) => void;
  onOpenSearch: () => void;
  onOpenSearchPersonal: () => void;

  // Admin
  onAdminAccess: () => void;
  adminMode: boolean;

  // Stazione attiva
  activeStationId: string | null;
  stationData: HomeStationData | null;
  stationLoading: boolean;
  onStationSelected: (id: string) => void;
  onStationCleared: () => void;

  // Deep-link
  onOpenStazione: (stationId: string, stationName?: string, categoriaFilter?: string) => void;
  onOpenSegnalazione: (stationName: string) => void;

  /** Incrementato da App.tsx a ogni pull-to-refresh: ricarica il feed "Da sapere". */
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenSearch,
  onOpenSearchPersonal,
  onAdminAccess,
  adminMode,
  activeStationId,
  stationData,
  stationLoading,
  onStationSelected,
  onStationCleared,
  onOpenStazione,
  onOpenSegnalazione,
  refreshKey,
}) => {
  const { favoriteStations, loading: favLoading } = useHomeFavorites(activeStationId);

  const badgeCount = stationData?.problemiAperti.length ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Feed "Da sapere" ─────────────────────────────────────────────────────

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    getHomeFeed().then((items) => {
      if (!cancelled) {
        setFeedItems(items);
        setFeedLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  function handleFeedItemClick(item: FeedItem) {
    if (!item.link) return;
    if (item.link.tipo === 'stazione' && item.link.stazioneId) {
      onOpenStazione(item.link.stazioneId, item.link.stazioneNome);
    } else if (item.link.tipo === 'salette' && item.link.stazioneNome) {
      onOpenSegnalazione(item.link.stazioneNome);
    }
  }

  // Voci delle stazioni preferite (o di quella attiva) prima, mantenendo
  // l'ordine cronologico sia dentro il gruppo prioritario sia nel resto —
  // il feed resta comunque completo, solo riordinato, non filtrato.
  const nomiPrioritari = useMemo(() => {
    const nomi = favoriteStations.map((s) => s.nome);
    if (stationData?.stazione.nome) nomi.push(stationData.stazione.nome);
    return new Set(nomi.map((n) => n.toLowerCase().trim()));
  }, [favoriteStations, stationData]);

  const feedItemsOrdinati = useMemo(() => {
    if (nomiPrioritari.size === 0) return feedItems;
    return [...feedItems].sort((a, b) => {
      const aPrioritaria = a.stazione && nomiPrioritari.has(a.stazione.toLowerCase().trim()) ? 0 : 1;
      const bPrioritaria = b.stazione && nomiPrioritari.has(b.stazione.toLowerCase().trim()) ? 0 : 1;
      return aPrioritaria - bPrioritaria;
    });
  }, [feedItems, nomiPrioritari]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleApriStazione() {
    if (activeStationId) {
      onOpenStazione(activeStationId, stationData?.stazione.nome);
    } else {
      onNavigate('stazioni');
    }
  }

  const [showSceltaSegnalazione, setShowSceltaSegnalazione] = useState(false);

  function handleNuovoContributo() { onNavigate('contributi'); }

  function handleSegnalaProblema() {
    if (stationData?.stazione.nome) {
      onOpenSegnalazione(stationData.stazione.nome);
    } else {
      // Nessuna stazione selezionata: invece di un tab generico non
      // filtrato, chiediamo subito "cosa vuoi segnalare" e portiamo
      // l'utente al posto giusto in un tap.
      setShowSceltaSegnalazione(true);
    }
  }

  function handleSelectFavorite(id: string) { onStationSelected(id); }

  function handleOpenAttivita() {
    if (activeStationId) onOpenStazione(activeStationId, stationData?.stazione.nome, 'attivita');
  }
  function handleOpenHotel() {
    if (activeStationId) onOpenStazione(activeStationId, stationData?.stazione.nome, 'Hotel');
  }
  function handleOpenSalette() {
    if (stationData?.stazione.nome) {
      onOpenSegnalazione(stationData.stazione.nome);
    } else {
      onNavigate('salette');
    }
  }
  function handleOpenProblemi() { onNavigate('salette'); }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full min-h-0 bg-gray-50 overflow-y-auto scrollbar-hide"
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <div>
            <h1 className="text-lg font-bold text-gray-900">Supremi Advisor</h1>
            {stationData ? (
              <p className="text-xs text-gray-400">{stationData.stazione.nome}</p>
            ) : (
              <p className="text-xs text-gray-400">Seleziona la tua stazione</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {badgeCount > 0 && (
              <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 flex items-center justify-center px-1">
                <span className="text-[10px] font-bold text-white leading-none">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              </span>
            )}
            <button
              onClick={onAdminAccess}
              className={[
                'flex items-center gap-1.5 h-9 px-3 rounded-xl transition-colors',
                adminMode
                  ? 'bg-trenord-green text-white'
                  : 'bg-gray-50 text-gray-500 active:bg-gray-100',
              ].join(' ')}
            >
              <Settings className="w-[17px] h-[17px]" />
              {adminMode && (
                <span className="text-[10px] font-bold tracking-wide">ADMIN</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENUTO SCROLLABILE ─────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-6 py-5"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <StazioneCard
          data={stationData}
          loading={stationLoading}
          onApri={handleApriStazione}
          onCambia={onOpenSearchPersonal}
          onRimuovi={onStationCleared}
          onOpenSalette={handleOpenSalette}
          onOpenAttivita={handleOpenAttivita}
          onOpenHotel={handleOpenHotel}
          onOpenProblemi={handleOpenProblemi}
        />

        <QuickActions
          onNuovoContributo={handleNuovoContributo}
          onSegnalaProblema={handleSegnalaProblema}
        />

        <FavoriteStations
          stations={favoriteStations}
          activeStationId={activeStationId}
          loading={favLoading}
          onSelect={handleSelectFavorite}
        />

        <SearchBar onFocus={onOpenSearch} />

        <UpdateFeed items={feedItemsOrdinati} loading={feedLoading} onItemClick={handleFeedItemClick} />
      </div>

      {showSceltaSegnalazione && (
        <SceltaSegnalazioneModal
          onClose={() => setShowSceltaSegnalazione(false)}
          onScegliSaletta={() => { setShowSceltaSegnalazione(false); onNavigate('salette'); }}
          onScegliAttivita={() => { setShowSceltaSegnalazione(false); onNavigate('stazioni'); }}
        />
      )}
    </div>
  );
};

export default HomeScreen;
