import React, { useRef } from 'react';
import { Settings } from 'lucide-react';

import type { Tab } from '../types';
import type { HomeStationData } from '../hooks/useHomeStation';

import { useHomeFavorites } from '../hooks/useHomeFavorites';

import {
  StazioneCard,
  QuickActions,
  FavoriteStations,
  UpdateFeed,
  FeedItem,
  SearchBar,
} from '../components/home';

// ---------------------------------------------------------------------------
// Feed statico — rimosso in Iterazione 3
// ---------------------------------------------------------------------------

const STATIC_FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-001',
    tipo: 'avviso',
    titolo: 'Saletta Equipaggi chiusa',
    stazione: 'Milano Porta Garibaldi',
    descrizione: 'La saletta è temporaneamente chiusa per manutenzione straordinaria.',
    tempo: '1h fa',
  },
  {
    id: 'feed-002',
    tipo: 'info',
    titolo: 'Nuovo orario bar interno',
    stazione: 'Brescia',
    descrizione: 'Il bar del piano 2 ha modificato gli orari: aperto 6:00–21:00.',
    tempo: '3h fa',
  },
  {
    id: 'feed-003',
    tipo: 'risolto',
    titolo: 'Problema risolto',
    stazione: 'Bergamo',
    descrizione: 'Il guasto alla porta principale è stato riparato.',
    tempo: 'Ieri',
  },
];

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
}) => {
  const { favoriteStations, loading: favLoading } = useHomeFavorites(activeStationId);

  const badgeCount = stationData?.problemiAperti.length ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleApriStazione() {
    if (activeStationId) {
      onOpenStazione(activeStationId, stationData?.stazione.nome);
    } else {
      onNavigate('stazioni');
    }
  }

  function handleNuovoContributo() { onNavigate('contributi'); }

  function handleSegnalaProblema() {
    if (stationData?.stazione.nome) {
      onOpenSegnalazione(stationData.stazione.nome);
    } else {
      onNavigate('salette');
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
          stazioneId={activeStationId ?? undefined}
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

        <UpdateFeed items={STATIC_FEED_ITEMS} />
      </div>
    </div>
  );
};

export default HomeScreen;