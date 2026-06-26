import React, { useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';

import type { Tab } from '../types';
import type { HomeStationData } from '../hooks/useHomeStation';

import { useHomeFavorites } from '../hooks/useHomeFavorites';
import { modalOpenCount } from '../lib/useScrollLock';

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
// Costanti PTR — identiche ad App.tsx per coerenza UX
// ---------------------------------------------------------------------------

const PULL_THRESHOLD = 180;
const DIRECTION_LOCK_PX = 20;

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
  onOpenStazione: (stationId: string, categoriaFilter?: string) => void;
  onOpenSegnalazione: (stationName: string) => void;

  /**
   * Callback per il Pull-to-Refresh locale della Home.
   * La Home ascolta i touch sul proprio container scrollabile
   * (overflow-y-auto) dove window non riceve touchmove.
   * App.tsx passa refreshApp() qui; il PTR su window gestisce
   * le altre schermate senza modifiche.
   */
  onRefresh: () => void;
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
  onRefresh,
}) => {
  const { favoriteStations, loading: favLoading } = useHomeFavorites(activeStationId);

  const badgeCount = stationData?.problemiAperti.length ?? 0;

  // ── Ref al container scrollabile ─────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Pull-to-Refresh locale ────────────────────────────────────────────────
  // App.tsx ascolta window per le schermate con body-scroll (Salette, Stazioni).
  // HomeScreen usa overflow-y-auto interno → window non riceve touchmove.
  // Questo useEffect ascolta direttamente il div scrollabile.
  // Stessi parametri e guardie di App.tsx per coerenza UX.

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchEndY = 0;
    let pulling = false;
    let directionLocked = false;

    function handleTouchStart(e: TouchEvent) {
      // Attiva solo se il container è scrollato in cima
      if (el.scrollTop > 0) return;
      // Nessun PTR se un modal è aperto
      if (modalOpenCount.current > 0) return;

      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
      pulling = true;
      directionLocked = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY;
      const deltaX = currentX - touchStartX;

      if (!directionLocked) {
        const movedEnough =
          Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!movedEnough) return;
        // Gesto orizzontale → non è PTR
        if (Math.abs(deltaX) > Math.abs(deltaY)) { pulling = false; return; }
        // Gesto verso l'alto → non è PTR
        if (deltaY < 0) { pulling = false; return; }
        directionLocked = true;
      }

      // Se nel frattempo il container ha scrollato (inerzia), annulla
      if (el.scrollTop > 5) { pulling = false; directionLocked = false; return; }

      touchEndY = currentY;
    }

    function handleTouchEnd() {
      if (!pulling) return;

      const distance = touchEndY - touchStartY;

      if (
        distance > PULL_THRESHOLD &&
        directionLocked &&
        el.scrollTop <= 0 &&
        modalOpenCount.current === 0
      ) {
        onRefresh();
      }

      pulling = false;
      directionLocked = false;
      touchStartY = 0;
      touchStartX = 0;
      touchEndY = 0;
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleApriStazione() {
    if (activeStationId) {
      onOpenStazione(activeStationId);
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
    if (activeStationId) onOpenStazione(activeStationId, 'attivita');
  }
  function handleOpenHotel() {
    if (activeStationId) onOpenStazione(activeStationId, 'Hotel');
  }
  function handleOpenSalette() { onNavigate('salette'); }
  function handleOpenProblemi() { onNavigate('salette'); }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full bg-gray-50 overflow-y-auto scrollbar-hide"
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