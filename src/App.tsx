import { useState, useEffect, useRef } from 'react';

import type { Tab } from './types';

import NavBar from './components/NavBar';

import TabBar from './components/TabBar';

import SaletteScreen from './screens/SaletteScreen';

import StazioniScreen from './screens/StazioniScreen';

import AdminScreen from './screens/AdminScreen';

import SegnalazioniScreen from './screens/SegnalazioniScreen';

import ContributiScreen from './screens/ContributiScreen';

import { Toaster } from 'react-hot-toast';

import toast from 'react-hot-toast';

import {
  RefreshCw,
} from 'lucide-react';

const ADMIN_PIN = '1105';

const screenTitles: Record<Tab, string> = {

  salette: 'Salette',

  stazioni: 'Stazioni',

  contributi: 'Contributi',

  segnalazioni: 'Segnalazioni',

  admin: 'Amministrazione',
};

export default function App() {

  const [activeTab, setActiveTab] =
    useState<Tab>('salette');

  // =========================
  // GLOBAL REFRESH
  // =========================

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [refreshing, setRefreshing] =
    useState(false);

  function refreshApp() {

    setRefreshing(true);

    setRefreshKey(
      (prev) => prev + 1
    );

    toast.success(
      'Aggiornamento app...'
    );

    setTimeout(() => {

      setRefreshing(false);

    }, 1200);
  }

  // =========================
  // PULL TO REFRESH
  // =========================

  const touchStartY =
    useRef(0);

  const touchEndY =
    useRef(0);

  const pulling =
    useRef(false);

  useEffect(() => {

    function handleTouchStart(
      e: TouchEvent
    ) {

      if (
        window.scrollY <= 0
      ) {

        touchStartY.current =
          e.touches[0].clientY;

        pulling.current =
          true;
      }
    }

    function handleTouchMove(
      e: TouchEvent
    ) {

      if (
        !pulling.current
      )
        return;

      touchEndY.current =
        e.touches[0].clientY;
    }

    function handleTouchEnd() {

      if (
        !pulling.current
      )
        return;

      const distance =
        touchEndY.current -
        touchStartY.current;

      // TRIGGER
      if (
        distance > 120 &&
        window.scrollY <= 10 &&
        !refreshing
      ) {

        refreshApp();
      }

      pulling.current =
        false;

      touchStartY.current = 0;

      touchEndY.current = 0;
    }

    window.addEventListener(
      'touchstart',
      handleTouchStart,
      {
        passive: true,
      }
    );

    window.addEventListener(
      'touchmove',
      handleTouchMove,
      {
        passive: true,
      }
    );

    window.addEventListener(
      'touchend',
      handleTouchEnd
    );

    return () => {

      window.removeEventListener(
        'touchstart',
        handleTouchStart
      );

      window.removeEventListener(
        'touchmove',
        handleTouchMove
      );

      window.removeEventListener(
        'touchend',
        handleTouchEnd
      );
    };

  }, [refreshing]);

  // =========================
  // ADMIN MODE PERSISTENTE
  // =========================

  const [adminMode, setAdminMode] =
    useState(false);

  useEffect(() => {

    const stored =
      localStorage.getItem(
        'trenord_admin'
      );

    if (stored === 'true') {

      setAdminMode(true);

      toast.success(
        'Modalità admin ripristinata'
      );
    }

  }, []);

  // =========================
  // ADMIN ACCESS
  // =========================

  function handleAdminAccess() {

    // LOGOUT
    if (adminMode) {

      const confirmLogout =
        window.confirm(
          'Disattivare modalità admin?'
        );

      if (confirmLogout) {

        localStorage.removeItem(
          'trenord_admin'
        );

        setAdminMode(false);

        setActiveTab(
          'salette'
        );

        toast.success(
          'Modalità admin disattivata'
        );
      }

      return;
    }

    // LOGIN
    const pin =
      window.prompt(
        'Inserisci PIN admin'
      );

    if (pin === ADMIN_PIN) {

      localStorage.setItem(
        'trenord_admin',
        'true'
      );

      setAdminMode(true);

      toast.success(
        'Modalità admin attivata'
      );

    } else if (
      pin != null
    ) {

      toast.error(
        'PIN errato'
      );
    }
  }

  return (

    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* PULL REFRESH INDICATOR */}
      <div
        className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
          refreshing
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4'
        }`}
      >

        <div className="bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2">

          <RefreshCw className="w-4 h-4 animate-spin text-trenord-green" />

          <span className="text-xs font-medium text-gray-700">

            Aggiornamento...

          </span>

        </div>

      </div>

      {/* NAVBAR */}
      <NavBar
        title={
          adminMode
            ? 'Supremi Advisor • ADMIN'
            : 'Supremi Advisor'
        }
        onAdminAccess={
          handleAdminAccess
        }
      />

      {/* TITLE */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">

        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-3">

            <h1 className="text-lg font-bold text-gray-900">

              {
                screenTitles[
                  activeTab
                ]
              }

            </h1>

            {adminMode && (

              <div className="px-2 py-1 rounded-full bg-trenord-green text-white text-[10px] font-bold tracking-wide shadow-sm">

                ADMIN

              </div>
            )}

          </div>

          {/* REFRESH */}
          <button
            onClick={refreshApp}
            className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >

            <RefreshCw
              className={`w-4 h-4 text-gray-600 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

          </button>

        </div>

      </div>

      {/* CONTENT */}
      <main className="flex-1 pt-[112px] pb-[72px]">

        <div className="max-w-2xl mx-auto px-4 py-4">

          {activeTab ===
            'salette' && (

            <SaletteScreen
              refreshKey={
                refreshKey
              }
            />
          )}

          {activeTab ===
            'stazioni' && (

            <StazioniScreen
              refreshKey={
                refreshKey
              }
            />
          )}

          {activeTab ===
            'contributi' && (

            <ContributiScreen />
          )}

          {activeTab ===
            'segnalazioni' &&
            adminMode && (

              <SegnalazioniScreen
                refreshKey={
                  refreshKey
                }
              />
            )}

          {activeTab ===
            'admin' &&
            adminMode && (

              <AdminScreen
                refreshKey={
                  refreshKey
                }
              />
            )}

        </div>

      </main>

      {/* TABBAR */}
      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        adminMode={adminMode}
      />

      {/* GLOBAL TOASTER */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,

          style: {

            borderRadius: '16px',

            fontSize: '14px',

            padding: '12px 16px',
          },

          success: {

            style: {

              background: '#ECFDF5',

              color: '#065F46',
            },
          },

          error: {

            style: {

              background: '#FEF2F2',

              color: '#991B1B',
            },
          },
        }}
      />

    </div>
  );
}