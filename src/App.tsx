import { useState, useEffect, useCallback } from 'react';

import type { Tab } from './types';

import NavBar from './components/NavBar';
import TabBar from './components/TabBar';

import HomeScreen from './screens/HomeScreen';
import SaletteScreen from './screens/SaletteScreen';
import StazioniScreen from './screens/StazioniScreen';
import AdminScreen from './screens/AdminScreen';
import SegnalazioniScreen from './screens/SegnalazioniScreen';
import ContributiScreen from './screens/ContributiScreen';
import FaqScreen from './screens/FaqScreen';

import { SearchOverlay } from './components/home/SearchOverlay';
import { useHomeStation } from './hooks/useHomeStation';

import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

import AdminPinModal from './components/AdminPinModal';
import { useTheme } from './hooks/useTheme';

const screenTitles: Record<Tab, string> = {
  home: 'Home',
  salette: 'Salette',
  stazioni: 'Stazioni',
  contributi: 'Contributi',
  segnalazioni: 'Segnalazioni',
  admin: 'Amministrazione',
  faq: 'Aiuto & FAQ',
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Deep-link dalla notifica Telegram (?admin=contributi / ?admin=problemi)
  // — usato sia per aprire subito la sezione giusta sia (più sotto, nello
  // stesso effect di ripristino PIN) per decidere se mostrare il login
  // quando la sessione admin non è salvata su questo dispositivo. Letto
  // una sola volta al mount, prima che l'URL venga ripulito. Vedi
  // conversazione.
  const [adminDeepLinkSection, setAdminDeepLinkSection] =
    useState<'contributi' | 'problemi' | null>(null);

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

  // refreshApp è la callback "onRefresh" condivisa, passata a ogni schermata
  // che usa usePullToRefresh. Non sa nulla di gesture o listener touch:
  // si limita ad aggiornare lo stato applicativo (refreshKey, indicatore
  // globale, toast). useCallback mantiene una referenza stabile.
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
  const [pendingStationName, setPendingStationName] = useState<string | null>(null);

  // =========================
  // NAVIGAZIONE ↔ HISTORY API DEL BROWSER
  //
  // L'app non usa URL/routing: il cambio tab è solo stato React, quindi il
  // browser non sa mai "sei entrato in una nuova schermata" — il tasto/gesto
  // indietro del telefono non ha nulla su cui tornare e nel peggiore dei
  // casi fa uscire dall'app. Qui si registra una voce di history a ogni
  // cambio tab, così indietro (tasto fisico Android, gesto edge-swipe,
  // bottone del browser) torna al tab precedente invece di uscire.
  // =========================

  function pushTabHistory(tab: Tab) {
    window.history.pushState({ tab }, '');
  }

  useEffect(() => {
    // Voce iniziale, senza aggiungerne una nuova (replaceState, non pushState).
    window.history.replaceState({ tab: 'home' }, '');

    function onPopState(event: PopStateEvent) {
      const tab = (event.state?.tab as Tab | undefined) ?? 'home';
      setActiveTab(tab);
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function handleOpenStazione(stationId: string, stationName?: string, categoriaFilter?: string) {
    setPendingExpandId(stationId);
    setPendingStationName(stationName ?? null);
    setPendingCategoriaFilter(categoriaFilter ?? null);
    window.scrollTo(0, 0);
    setActiveTab('stazioni');
    pushTabHistory('stazioni');
  }

  function handleOpenSegnalazione(stationName: string) {
    setPendingSaletteStationName(stationName);
    window.scrollTo(0, 0);
    setActiveTab('salette');
    pushTabHistory('salette');
  }

  function handleTabChange(tab: Tab) {
    setPendingExpandId(null);
    setPendingStationName(null);
    setPendingCategoriaFilter(null);
    setPendingSaletteStationName(null);
    window.scrollTo(0, 0);
    setActiveTab(tab);
    pushTabHistory(tab);
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
  // Il pull-to-refresh non è più gestito qui: ogni schermata che lo
  // desidera usa autonomamente l'hook src/lib/usePullToRefresh.ts,
  // passandogli `refreshApp` come callback. App.tsx si limita a fornire
  // `refreshApp` e a mostrare l'indicatore globale (vedi JSX più sotto).
  // =========================

  // =========================
  // ADMIN MODE
  // =========================
  const [adminMode, setAdminMode] = useState(false);
  const [adminPin, setAdminPinState] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState<'login' | 'logout' | null>(null);
  const [pinVerificando, setPinVerificando] = useState(false);

  useEffect(() => {
    // Letto qui (variabile locale, non stato React) e non nell'effect
    // separato di prima proprio per evitare il problema di ordine: due
    // effect diversi creati nello stesso render iniziale non si vedono a
    // vicenda finché non arriva un secondo render, quindi tutta la logica
    // che dipende dal deep-link va nello stesso effect. Vedi conversazione.
    const params = new URLSearchParams(window.location.search);
    const deepLinkSection = params.get('admin');
    const isValidSection = deepLinkSection === 'contributi' || deepLinkSection === 'problemi';

    if (isValidSection) {
      setAdminDeepLinkSection(deepLinkSection as 'contributi' | 'problemi');
      setActiveTab('admin');
      pushTabHistory('admin');
    }

    // Ripulisce l'URL (toglie ?admin=...) senza ricaricare la pagina, così
    // un refresh successivo non riapre sempre la stessa sezione.
    if (params.has('admin')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const stored = localStorage.getItem('trenord_admin_pin');
    if (!stored) {
      // Nessuna sessione admin salvata su questo dispositivo: se si è
      // arrivati qui da un deep-link (notifica Telegram), apre subito il
      // login invece di lasciare la schermata vuota.
      if (isValidSection) setShowPinModal('login');
      return;
    }

    // Il PIN salvato viene sempre riverificato contro il database
    // all'avvio — se nel frattempo è stato cambiato (da questo o da un
    // altro dispositivo), la sessione locale non resta valida per errore.
    fetch('/.netlify/functions/verify-admin-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: stored }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setAdminPinState(stored);
          setAdminMode(true);
          toast.success('Modalità admin ripristinata');
        } else {
          localStorage.removeItem('trenord_admin_pin');
          if (isValidSection) setShowPinModal('login');
        }
      })
      .catch(() => {
        // Errore di rete al mount: non blocca l'app, semplicemente non
        // ripristina la modalità admin — l'utente può rientrare col PIN.
      });
  }, []);

  function handleAdminAccess() {
    adminMode ? setShowPinModal('logout') : setShowPinModal('login');
  }

  async function handlePinConfirm(pin?: string) {
    if (showPinModal === 'login') {
      if (!pin) { setShowPinModal(null); return; }

      setPinVerificando(true);
      try {
        const res = await fetch('/.netlify/functions/verify-admin-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();

        if (data.ok) {
          localStorage.setItem('trenord_admin_pin', pin);
          setAdminPinState(pin);
          setAdminMode(true);
          toast.success('Modalità admin attivata');
          setShowPinModal(null);
        } else {
          toast.error('PIN errato');
        }
      } catch {
        toast.error('Errore di rete, riprova');
      } finally {
        setPinVerificando(false);
      }
    } else {
      localStorage.removeItem('trenord_admin_pin');
      setAdminPinState(null);
      setAdminMode(false);
      setActiveTab('home');
      pushTabHistory('home');
      toast.success('Modalità admin disattivata');
      setShowPinModal(null);
    }
  }

  const isHomeTab = activeTab === 'home';

  return (
    <div className="h-dvh bg-gray-100 dark:bg-gray-950 flex flex-col">

      {/* PULL REFRESH INDICATOR */}
      <div className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-300 ${refreshing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 flex items-center gap-2">
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* TITLE BAR */}
      {!isHomeTab && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{screenTitles[activeTab]}</h1>
              {adminMode && (
                <div className="px-2 py-1 rounded-full bg-trenord-green text-white text-[10px] font-bold tracking-wide shadow-sm">
                  ADMIN
                </div>
              )}
            </div>
            <button onClick={refreshApp} className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <main className={isHomeTab ? 'flex-1 min-h-0' : 'flex-1 min-h-0 pt-[112px] pb-[72px]'}>

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
            refreshKey={refreshKey}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {activeTab === 'salette' && (
          <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-full min-h-0">
            <SaletteScreen
              refreshKey={refreshKey}
              onRefresh={refreshApp}
              onNavigateToContributi={() => handleTabChange('contributi')}
              initialStationName={pendingSaletteStationName}
            />
          </div>
        )}

        {activeTab === 'stazioni' && (
          <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-full min-h-0">
            <StazioniScreen
              refreshKey={refreshKey}
              onRefresh={refreshApp}
              onNavigateToContributi={() => handleTabChange('contributi')}
              initialExpandedId={pendingExpandId}
              initialStationName={pendingStationName}
              initialCategoriaFilter={pendingCategoriaFilter}
            />
          </div>
        )}

        {activeTab === 'contributi' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <ContributiScreen />
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <FaqScreen />
          </div>
        )}

        {activeTab === 'segnalazioni' && adminMode && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <SegnalazioniScreen refreshKey={refreshKey} />
          </div>
        )}

        {activeTab === 'admin' && adminMode && (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <AdminScreen
              refreshKey={refreshKey}
              adminPin={adminPin ?? ''}
              initialSection={adminDeepLinkSection ?? undefined}
            />
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
        mode={searchIsPersonal ? 'personal' : 'navigate'}
        onSelectStation={(id, nome) => {
          if (searchIsPersonal) {
            setActiveStation(id);
          } else {
            handleOpenStazione(id, nome);
          }
          setSearchOpen(false);
        }}
        onSelectSalette={(stationName) => {
          handleOpenSegnalazione(stationName);
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
          loading={pinVerificando}
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
