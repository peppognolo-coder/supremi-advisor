import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';

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
// Dati statici temporanei — SOLO il feed, in attesa dell'Iterazione 3
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
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  // ── Logica reale ──────────────────────────────────────────────────────────
  const {
    activeStationId,
    data: stationData,
    loading: stationLoading,
    setActiveStation,
  } = useHomeStation();

  const {
    favoriteStations,
    loading: favLoading,
  } = useHomeFavorites(activeStationId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleApriStazione() {
    onNavigate('stazioni');
  }

  function handleNuovoContributo() {
    onNavigate('contributi');
  }

  function handleSegnalaProblema() {
    // Il flusso di segnalazione saletta esiste già in SaletteScreen
    onNavigate('salette');
  }

  function handleSelectFavorite(id: string) {
    setActiveStation(id);
  }

  function handleSelectFromSearch(id: string) {
    setActiveStation(id);
  }

  // Conteggio badge notifiche = problemi aperti sulla stazione attiva
  const badgeCount = stationData?.problemiAperti.length ?? 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50 overflow-y-auto scrollbar-hide">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        {/*
          Safe area top: env(safe-area-inset-top) è già gestita dal body::before
          in index.css (white block sopra il contenuto). L'header sticky si
          posiziona subito sotto, senza gap. Su notch/camera hole funziona
          correttamente perché NavBar (che usa safe-top) è assente sulla Home.
        */}
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
              {/* Bell con badge problemi aperti */}
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 active:bg-gray-100 transition-colors">
                <Bell className="w-[18px] h-[18px]" />
                {badgeCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white leading-none px-0.5">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  </span>
                )}
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 active:bg-gray-100 transition-colors">
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENUTO SCROLLABILE ───────────────────────────────────────── */}
        {/*
          Safe area bottom: pb usa calc per sommare il padding fisso alla
          safe area inset, così il contenuto non finisce sotto la home bar
          di iOS o la gesture bar di Android.
        */}
        <div
          className="flex flex-col gap-6 py-5"
          style={{
            paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* 1. LA TUA STAZIONE */}
          <StazioneCard
            data={stationData}
            loading={stationLoading}
            onApri={handleApriStazione}
            onCambia={() => setSearchOpen(true)}
          />

          {/* 2. AZIONI RAPIDE */}
          <QuickActions
            stazioneId={activeStationId ?? undefined}
            onNuovoContributo={handleNuovoContributo}
            onSegnalaProblema={handleSegnalaProblema}
            onApriStazione={handleApriStazione}
          />

          {/* 3. LE MIE STAZIONI */}
          <FavoriteStations
            stations={favoriteStations}
            activeStationId={activeStationId}
            loading={favLoading}
            onSelect={handleSelectFavorite}
          />

          {/* 4. RICERCA */}
          <SearchBar onFocus={() => setSearchOpen(true)} />

          {/* 5. DA SAPERE — ancora statico, Iterazione 3 */}
          <UpdateFeed items={STATIC_FEED_ITEMS} />
        </div>
      </div>

      {/* ── SEARCH OVERLAY ────────────────────────────────────────────────── */}
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