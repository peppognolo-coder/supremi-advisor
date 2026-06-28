import { useState, useEffect, useRef, useCallback } from 'react';

import type { Tab } from './types';

import NavBar from './components/NavBar';
import TabBar from './components/TabBar';

import HomeScreen from './screens/HomeScreen';
import SaletteScreen from './screens/SaletteScreen';
import StazioniScreen from './screens/StazioniScreen';
import AdminScreen from './screens/AdminScreen';
import SegnalazioniScreen from './screens/SegnalazioniScreen';
import ContributiScreen from './screens/ContributiScreen';

import { SearchOverlay } from './components/home/SearchOverlay';
import { useHomeStation } from './hooks/useHomeStation';

import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

import AdminPinModal from './components/AdminPinModal';
import { modalOpenCount } from './lib/useScrollLock';

const ADMIN_PIN = '1105';

const screenTitles: Record<Tab, string> = {
  home: 'Home',
  salette: 'Salette',
  stazioni: 'Stazioni',
  contributi: 'Contributi',
  segnalazioni: 'Segnalazioni',
  admin: 'Amministrazione',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIsPersonal, setSearchIsPersonal] = useState(false);

  function openSearchPersonal() {
    setSearchIsPersonal(true);
    setSearchOpen(true);
  }

  function openSearchNavigate() {
    setSearchIsPersonal(false);
    setSearchOpen(true);
  }

  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // useCallback: referenza stabile — evita re-registrazione continua dei listener touch
  const refreshApp = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    toast.success('Aggiornamento app...');
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const {
    activeStationId,
    data: stationData,
    loading: stationLoading,
    setActiveStation,
    clearActiveStation,
  } = useHomeStation(refreshKey, activeTab === 'home');

  const [pendingExpandId, setPendingExpandId] = useState<string | null>(null);
  const [pendingCategoriaFilter, setPendingCategoriaFilter] = useState<string | null>(null);
  const [pendingSaletteStationName, setPendingSaletteStationName] = useState<string | null>(null);

  function handleOpenStazione(stationId: string, categoriaFilter?: string) {
    setPendingExpandId(stationId);
    setPendingCategoriaFilter(categoriaFilter ?? null);
    setActiveTab('stazioni');
  }

  function handleOpenSegnalazione(stationName: string) {
    setPendingSaletteStationName(stationName);
    setActiveTab('salette');
  }

  function handleTabChange(tab: Tab) {
    setPendingExpandId(null);
    setPendingCategoriaFilter(null);
    setPendingSaletteStationName(null);
    window.scrollTo(0, 0);
    setActiveTab(tab);
  }

  // =========================
  // META TAGS PWA
  // =========================
  useEffect(() => {
    document.title = 'Supremi Advisor';
    const favicon =
      (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
      (() => { const el = document.createElement('link'); el.rel = 'icon'; document.head.appendChild(el); return el; })();
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
    const apple =
      (document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement) ||
      (() => { const el = document.createElement('link'); el.rel = 'apple-touch-icon'; document.head.appendChild(el); return el; })();
    apple.href = '/apple-touch-icon.png';
    const themeColor =
      (document.querySelector("meta[name='theme-color']") as HTMLMetaElement) ||
      (() => { const el = document.createElement('meta'); el.name = 'theme-color'; document.head.appendChild(el); return el; })();
    themeColor.content = '#007A3D';
  }, []);

  // =========================
  // PULL TO REFRESH
  // Il PTR ascolta su window per le schermate con body-scroll (Salette, Stazioni, ecc).
  // Per la Home, il PTR è gestito dal container interno in HomeScreen.
  //
  // PROBLEMA RISOLTO: il layout min-h-screen + flex-col fa sì che
  // su schermate normali il body non scrolli se il contenuto è corto.
  // Per questo aggiungiamo anche il listener sull'elemento scrollabile
  // quando si è su tab non-Home.
  // =========================

  const touchStartY   = useRef(0);
  const touchStartX   = useRef(0);
  const touchEndY     = useRef(0);
  const pulling       = useRef(false);
  const directionLocked = useRef(false);
  const PULL_THRESHOLD  = 180;
  const DIRECTION_LOCK_PX = 20;

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Blocca se modal aperto
      if (modalOpenCount.current > 0) return;
      // Blocca se la pagina ha già scrollato (non siamo in cima)
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 0) return;

      touchStartY.current     = e.touches[0].clientY;
      touchStartX.current     = e.touches[0].clientX;
      touchEndY.current       = e.touches[0].clientY;
      pulling.current         = true;
      directionLocked.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY   = currentY - touchStartY.current;
      const deltaX   = currentX - touchStartX.current;

      if (!directionLocked.current) {
        const moved = Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!moved) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) { pulling.current = false; return; }
        if (deltaY < 0) { pulling.current = false; return; }
        directionLocked.current = true;
      }

      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 5) { pulling.current = false; directionLocked.current = false; return; }

      touchEndY.current = currentY;
    }

    function onTouchEnd() {
      if (!pulling.current) return;

      const distance = touchEndY.current - touchStartY.current;
      const scrollY  = window.scrollY || document.documentElement.scrollTop;

      if (
        distance > PULL_THRESHOLD &&
        directionLocked.current &&
        scrollY <= 0 &&
        !refreshing &&
        modalOpenCount.current === 0
      ) {
        refreshApp();
      }

      pulling.current         = false;
      directionLocked.current = false;
      touchStartY.current     = 0;
      touchStartX.current     = 0;
      touchEndY.current       = 0;
    }

    // Registra su window per le schermate con body-scroll
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [refreshing, refreshApp]);

  // =========================
  // ADMIN MODE
  // =========================
  const [adminMode, setAdminMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState<'login' | 'logout' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('trenord_admin');
    if (stored === 'true') {
      setAdminMode(true);
      toast.success('Modalità admin ripristinata');
    }
  }, []);

  function handleAdminAccess() {
    adminMode ? setShowPinModal('logout') : setShowPinModal('login');
  }

  function handlePinConfirm(pin?: string) {
    if (showPinModal === 'login') {
      if (pin === ADMIN_PIN) {
        localStorage.setItem('trenord_admin', 'true');
        setAdminMode(true);
        toast.success('Modalità admin attivata');
      } else {
        toast.error('PIN errato');
      }
    } else {
      localStorage.removeItem('trenord_admin');
      setAdminMode(false);
      setActiveTab('home');
      toast.success('Modalità admin disattivata');
    }
    setShowPinModal(null);
  }

  const isHomeTab = activeTab === 'home';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* PULL REFRESH INDICATOR */}
      <div className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-300 ${refreshing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-trenord-green" />
          <span className="text-xs font-medium text-gray-700">Aggiornamento...</span>
        </div>
      </div>

      {/* NAVBAR */}
      {!isHomeTab && (
        <NavBar
          title={adminMode ? 'Supremi Advisor • ADMIN' : 'Supremi Advisor'}
          onAdminAccess={handleAdminAccess}
          onLogoClick={() => handleTabChange('home')}
        />
      )}

      {/* TITLE BAR */}
      {!isHomeTab && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">{screenTitles[activeTab]}</h1>
              {adminMode && (
                <div className="px-2 py-1 rounded-full bg-trenord-green text-white text-[10px] font-bold tracking-wide shadow-sm">
                  ADMIN
                </div>
              )}
            </div>
            <button onClick={refreshApp} className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <main className={isHomeTab ? 'flex-1' : 'flex-1 pt-[112px] pb-[72px]'}>

        {activeTab === 'home' && (
          <HomeScreen
            onNavigate={handleTabChange}
            onOpenSearch={openSearchNavigate}
            onOpenSearchPersonal={openSearchPersonal}
            onAdminAccess={handleAdminAccess}
            adminMode={adminMode}
            activeStationId={activeStationId}
            stationData={stationData}
            stationLoading={stationLoading}
            onStationSelected={setActiveStation}
            onStationCleared={clearActiveStation}
            onOpenStazione={handleOpenStazione}
            onOpenSegnalazione={handleOpenSegnalazione}
            onRefresh={refreshApp}
          />
        )}

        {activeTab === 'salette' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <SaletteScreen
              refreshKey={refreshKey}
              onNavigateToContributi={() => handleTabChange('contributi')}
              initialStationName={pendingSaletteStationName}
            />
          </div>
        )}

        {activeTab === 'stazioni' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <StazioniScreen
              refreshKey={refreshKey}
              onNavigateToContributi={() => handleTabChange('contributi')}
              initialExpandedId={pendingExpandId}
              initialCategoriaFilter={pendingCategoriaFilter}
            />
          </div>
        )}

        {activeTab === 'contributi' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <ContributiScreen />
          </div>
        )}

        {activeTab === 'segnalazioni' && adminMode && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <SegnalazioniScreen refreshKey={refreshKey} />
          </div>
        )}

        {activeTab === 'admin' && adminMode && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <AdminScreen refreshKey={refreshKey} adminPin={ADMIN_PIN} />
          </div>
        )}
      </main>

      {/* TABBAR */}
      <TabBar
        activeTab={activeTab}
        onChange={handleTabChange}
        adminMode={adminMode}
        hidden={searchOpen}
      />

      {/* SEARCH OVERLAY */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectStation={(id) => {
          if (searchIsPersonal) {
            setActiveStation(id);
          } else {
            handleOpenStazione(id);
          }
          setSearchOpen(false);
        }}
        activeStationId={searchIsPersonal ? activeStationId : null}
      />

      {/* ADMIN PIN MODAL */}
      {showPinModal && (
        <AdminPinModal
          mode={showPinModal}
          onConfirm={handlePinConfirm}
          onClose={() => setShowPinModal(null)}
        />
      )}

      {/* TOASTER */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: { borderRadius: '16px', fontSize: '14px', padding: '12px 16px' },
          success: { style: { background: '#ECFDF5', color: '#065F46' } },
          error:   { style: { background: '#FEF2F2', color: '#991B1B' } },
        }}
      />
    </div>
  );
}
