import React, { useState } from 'react';
import { Settings } from 'lucide-react';

import type { Tab } from '../types';

import { useHomeStation } from '../hooks/useHomeStation';
import { useHomeFavorites } from '../hooks/useHomeFavorites';

import {
  StazioneCard,
  QuickActions,
  FavoriteStations,
  UpdateFeed,
  FeedItem,
  SearchBar,
  SearchOverlay,
} from '../components/home';

// ---------------------------------------------------------------------------
// Dati statici temporanei — SOLO il feed, rimosso in Iterazione 3
// ---------------------------------------------------------------------------

const STATIC_FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-001',
    tipo: 'avviso',
    titolo: 'Saletta Equipaggi chiusa',
    stazione: 'Milano Porta Garibaldi',
    descrizione:
      'La saletta è temporaneamente chiusa per manutenzione straordinaria. Riapertura prevista domani.',
    tempo: '1h fa',
  },
  {
    id: 'feed-002',
    tipo: 'info',
    titolo: 'Nuovo orario bar interno',
    stazione: 'Brescia',
    descrizione:
      'Il bar del piano 2 ha modificato gli orari: aperto 6:00–21:00 dal lunedì al sabato.',
    tempo: '3h fa',
  },
  {
    id: 'feed-003',
    tipo: 'risolto',
    titolo: 'Problema risolto',
    stazione: 'Bergamo',
    descrizione:
      'Il guasto alla porta principale è stato riparato. Accesso normale ripristinato.',
    tempo: 'Ieri',
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeScreenProps {
  onNavigate: (tab: Tab) => void;
  /** Apre il modal login/logout admin — ricevuto da App.tsx */
  onAdminAccess: () => void;
  /** Stato attuale della modalità admin — ricevuto da App.tsx */
  adminMode: boolean;
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onAdminAccess,
  adminMode,
}) => {
  const {
    activeStationId,
    data: stationData,
    loading: stationLoading,
    setActiveStation,
  } = useHomeStation();

  const { favoriteStations, loading: favLoading } = useHomeFavorites(activeStationId);

  const [searchOpen, setSearchOpen] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleApriStazione() {
    onNavigate('stazioni');
  }

  function handleNuovoContributo() {
    onNavigate('contributi');
  }

  function handleSegnalaProblema() {
    onNavigate('salette');
  }

  function handleSelectFavorite(id: string) {
    setActiveStation(id);
  }

  function handleSelectFromSearch(id: string) {
    setActiveStation(id);
  }

  const badgeCount = stationData?.problemiAperti.length ?? 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50 overflow-y-auto scrollbar-hide">

        {/* ── HEADER ────────────────────────────────────────────────────────
            safe-area-inset-top: gestisce notch/Dynamic Island/camera hole.
            Il padding minimo è 12px, cresce fino all'altezza dell'inset.
        ── */}
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
              {/* Badge problemi aperti — visibile solo se > 0 */}
              {badgeCount > 0 && (
                <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 flex items-center justify-center px-1">
                  <span className="text-[10px] font-bold text-white leading-none">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                </span>
              )}

              {/* Pulsante Admin — stesso comportamento di NavBar nelle altre schermate.
                  Mostra l'icona Settings. Quando adminMode è attivo, mostra il badge ADMIN.
              */}
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

        {/* ── CONTENUTO SCROLLABILE ─────────────────────────────────────────
            safe-area-inset-bottom: garantisce che l'ultimo elemento
            non finisca sotto la home bar di iOS o la gesture bar di Android.
        ── */}
        <div
          className="flex flex-col gap-6 py-5"
          style={{
            paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <StazioneCard
            data={stationData}
            loading={stationLoading}
            onApri={handleApriStazione}
            onCambia={() => setSearchOpen(true)}
          />

          <QuickActions
            stazioneId={activeStationId ?? undefined}
            onNuovoContributo={handleNuovoContributo}
            onSegnalaProblema={handleSegnalaProblema}
            onApriStazione={handleApriStazione}
          />

          <FavoriteStations
            stations={favoriteStations}
            activeStationId={activeStationId}
            loading={favLoading}
            onSelect={handleSelectFavorite}
          />

          <SearchBar onFocus={() => setSearchOpen(true)} />

          {/* Feed — statico fino a Iterazione 3 */}
          <UpdateFeed items={STATIC_FEED_ITEMS} />
        </div>
      </div>

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectStation={handleSelectFromSearch}
        activeStationId={activeStationId}
      />
    </>
  );
};

export default HomeScreen;