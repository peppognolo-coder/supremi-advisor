import { useState, useEffect, useRef } from 'react';

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

  // =========================
  // SEARCH OVERLAY GLOBALE
  // Elevato qui così TabBar può essere nascosta quando è aperto
  // =========================

  const [searchOpen, setSearchOpen] = useState(false);

  // Hook stazione attiva — condiviso tra HomeScreen e SearchOverlay
  const { activeStationId, setActiveStation } = useHomeStation();

  // =========================
  // META TAGS PWA
  // =========================

  useEffect(() => {
    document.title = 'Supremi Advisor';

    const favicon =
      (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
      (() => {
        const el = document.createElement('link');
        el.rel = 'icon';
        document.head.appendChild(el);
        return el;
      })();
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';

    const apple =
      (document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement) ||
      (() => {
        const el = document.createElement('link');
        el.rel = 'apple-touch-icon';
        document.head.appendChild(el);
        return el;
      })();
    apple.href = '/apple-touch-icon.png';

    const themeColor =
      (document.querySelector("meta[name='theme-color']") as HTMLMetaElement) ||
      (() => {
        const el = document.createElement('meta');
        el.name = 'theme-color';
        document.head.appendChild(el);
        return el;
      })();
    themeColor.content = '#007A3D';
  }, []);

  // =========================
  // GLOBAL REFRESH
  // =========================

  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function refreshApp() {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    toast.success('Aggiornamento app...');
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }

  // =========================
  // PULL TO REFRESH
  // =========================

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchEndY = useRef(0);
  const pulling = useRef(false);
  const directionLocked = useRef(false);

  const PULL_THRESHOLD = 180;
  const DIRECTION_LOCK_PX = 20;

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      if (modalOpenCount.current > 0) return;
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
      pulling.current = true;
      directionLocked.current = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY.current;
      const deltaX = currentX - touchStartX.current;

      if (!directionLocked.current) {
        const movedEnough =
          Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!movedEnough) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) { pulling.current = false; return; }
        if (deltaY < 0) { pulling.current = false; return; }
        directionLocked.current = true;
      }

      if (window.scrollY > 5) {
        pulling.current = false;
        directionLocked.current = false;
        return;
      }
      touchEndY.current = currentY;
    }

    function handleTouchEnd() {
      if (!pulling.current) return;
      const distance = touchEndY.current - touchStartY.current;
      if (
        distance > PULL_THRESHOLD &&
        directionLocked.current &&
        window.scrollY <= 0 &&
        !refreshing &&
        modalOpenCount.current === 0
      ) {
        refreshApp();
      }
      pulling.current = false;
      directionLocked.current = false;
      touchStartY.current = 0;
      touchStartX.current = 0;
      touchEndY.current = 0;
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [refreshing]);

  // =========================
  // ADMIN MODE PERSISTENTE
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
    if (adminMode) {
      setShowPinModal('logout');
    } else {
      setShowPinModal('login');
    }
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

  // =========================
  // NAVIGAZIONE
  // =========================

  function handleHomeNavigate(tab: Tab) {
    setActiveTab(tab);
  }

  const isHomeTab = activeTab === 'home';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* PULL REFRESH INDICATOR */}
      <div
        className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
          refreshing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-trenord-green" />
          <span className="text-xs font-medium text-gray-700">Aggiornamento...</span>
        </div>
      </div>

      {/* NAVBAR — nascosta sulla Home */}
      {!isHomeTab && (
        <NavBar
          title={adminMode ? 'Supremi Advisor • ADMIN' : 'Supremi Advisor'}
          onAdminAccess={handleAdminAccess}
          onLogoClick={() => setActiveTab('home')}
        />
      )}

      {/* TITLE BAR — nascosta sulla Home */}
      {!isHomeTab && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">
                {screenTitles[activeTab]}
              </h1>
              {adminMode && (
                <div className="px-2 py-1 rounded-full bg-trenord-green text-white text-[10px] font-bold tracking-wide shadow-sm">
                  ADMIN
                </div>
              )}
            </div>
            <button
              onClick={refreshApp}
              className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <main
        className={
          isHomeTab
            ? 'flex-1 overflow-hidden'
            : 'flex-1 pt-[112px] pb-[72px]'
        }
      >
        {activeTab === 'home' && (
          <HomeScreen
            onNavigate={handleHomeNavigate}
            onAdminAccess={handleAdminAccess}
            adminMode={adminMode}
            onOpenSearch={() => setSearchOpen(true)}
            onStationSelected={setActiveStation}
          />
        )}

        {activeTab === 'salette' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <SaletteScreen
              refreshKey={refreshKey}
              onNavigateToContributi={() => setActiveTab('contributi')}
            />
          </div>
        )}

        {activeTab === 'stazioni' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <StazioniScreen
              refreshKey={refreshKey}
              onNavigateToContributi={() => setActiveTab('contributi')}
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

      {/* TABBAR — nascosta quando SearchOverlay è aperto */}
      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        adminMode={adminMode}
        hidden={searchOpen}
      />

      {/* SEARCH OVERLAY GLOBALE
          Posizionato qui (radice del DOM) → z-[60] supera tutto
          Condivide useHomeStation con HomeScreen tramite il hook
          (stesso localStorage key → stessa stazione attiva)
      */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectStation={(id) => {
          setActiveStation(id);
          setSearchOpen(false);
        }}
        activeStationId={activeStationId}
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