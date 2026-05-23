import {
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  MapPin,
  MessageSquareWarning,
  ShieldCheck,
  Plus,
  ArrowLeft,
  FileJson,
  Store,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import AdminSaletteScreen from './AdminSaletteScreen';

import AdminContributiScreen from './AdminContributiScreen';

import AdminAttivitaScreen from './AdminAttivitaScreen';

export default function AdminScreen() {

  const [loading, setLoading] =
    useState(true);

  // =========================
  // SCREEN STATE
  // =========================

  const [
    showSaletteManager,
    setShowSaletteManager,
  ] = useState(false);

  const [
    showContributiManager,
    setShowContributiManager,
  ] = useState(false);

  const [
    showAttivitaManager,
    setShowAttivitaManager,
  ] = useState(false);

  // =========================
  // STATS
  // =========================

  const [stats, setStats] =
    useState({

      salette: 0,

      stazioni: 0,

      pending: 0,

      attivita: 0,
    });

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    // SALETTE
    const {
      count: saletteCount,
    } = await supabase
      .from('salette')
      .select('*', {
        count: 'exact',
        head: true,
      });

    // STAZIONI
    const {
      data: stazioni,
    } = await supabase
      .from('salette')
      .select('stazione');

    const uniqueStations =
      new Set(
        (stazioni ?? []).map(
          (s) => s.stazione
        )
      );

    // PENDING CONTRIBUTI
    const {
      count: pendingCount,
    } = await supabase
      .from('contributi')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('stato', 'pending');

    // ATTIVITA ATTIVE
    const {
      count: attivitaCount,
    } = await supabase
      .from('attivita_stazione')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true);

    setStats({

      salette:
        saletteCount ?? 0,

      stazioni:
        uniqueStations.size,

      pending:
        pendingCount ?? 0,

      attivita:
        attivitaCount ?? 0,
    });

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // ATTIVITA MANAGER
  // =========================

  if (showAttivitaManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() =>
            setShowAttivitaManager(
              false
            )
          }
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminAttivitaScreen />

      </div>
    );
  }

  // =========================
  // CONTRIBUTI MANAGER
  // =========================

  if (showContributiManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() =>
            setShowContributiManager(
              false
            )
          }
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminContributiScreen />

      </div>
    );
  }

  // =========================
  // SALETTE MANAGER
  // =========================

  if (showSaletteManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() =>
            setShowSaletteManager(
              false
            )
          }
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminSaletteScreen />

      </div>
    );
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="flex flex-col gap-5">

      {/* TITLE */}
      <div>

        <div className="flex items-center gap-2">

          <ShieldCheck className="w-6 h-6 text-trenord-green" />

          <h1 className="text-2xl font-bold text-gray-900">

            Dashboard Admin

          </h1>

        </div>

        <p className="text-sm text-gray-500 mt-1">

          Gestione salette e moderazione sistema

        </p>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="text-sm text-gray-500">

          Caricamento...

        </div>
      )}

      {/* STATS */}
      {!loading && (

        <div className="grid grid-cols-2 gap-3">

          {/* SALETTE */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

            <div className="flex items-center justify-between">

              <Building2 className="w-5 h-5 text-trenord-green" />

              <span className="text-2xl font-bold text-gray-900">

                {stats.salette}

              </span>

            </div>

            <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

              Salette

            </p>

          </div>

          {/* STAZIONI */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

            <div className="flex items-center justify-between">

              <MapPin className="w-5 h-5 text-blue-500" />

              <span className="text-2xl font-bold text-gray-900">

                {stats.stazioni}

              </span>

            </div>

            <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

              Stazioni

            </p>

          </div>

          {/* ATTIVITA */}
          <button
            onClick={() =>
              setShowAttivitaManager(
                true
              )
            }
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-trenord-green/40 transition-colors text-left"
          >

            <div className="flex items-center justify-between">

              <Store className="w-5 h-5 text-trenord-green" />

              <span className="text-2xl font-bold text-gray-900">

                {stats.attivita}

              </span>

            </div>

            <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

              Attività attive

            </p>

          </button>

          {/* PENDING */}
          <button
            onClick={() =>
              setShowContributiManager(
                true
              )
            }
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-amber-300 transition-colors text-left"
          >

            <div className="flex items-center justify-between">

              <MessageSquareWarning className="w-5 h-5 text-amber-500" />

              <span className="text-2xl font-bold text-gray-900">

                {stats.pending}

              </span>

            </div>

            <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

              Pending

            </p>

          </button>

        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">

        <h2 className="font-semibold text-gray-900">

          Azioni rapide

        </h2>

        {/* SALETTE */}
        <button
          onClick={() =>
            setShowSaletteManager(true)
          }
          className="flex items-center gap-3 p-3 rounded-xl bg-trenord-green text-white hover:opacity-90 transition-opacity"
        >

          <Plus className="w-5 h-5" />

          <span className="font-medium">

            Gestione salette

          </span>

        </button>

        {/* ATTIVITA */}
        <button
          onClick={() =>
            setShowAttivitaManager(true)
          }
          className="flex items-center gap-3 p-3 rounded-xl bg-purple-600 text-white hover:opacity-90 transition-opacity"
        >

          <Store className="w-5 h-5" />

          <span className="font-medium">

            Gestione attività

          </span>

        </button>

        {/* CONTRIBUTI */}
        <button
          onClick={() =>
            setShowContributiManager(true)
          }
          className="flex items-center gap-3 p-3 rounded-xl bg-blue-600 text-white hover:opacity-90 transition-opacity"
        >

          <FileJson className="w-5 h-5" />

          <span className="font-medium">

            Modera contributi

          </span>

        </button>

      </div>

      {/* INFO */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

        <h2 className="font-semibold text-gray-900 mb-3">

          Sistema

        </h2>

        <div className="flex flex-col gap-2 text-sm text-gray-600">

          <div className="flex items-center justify-between">

            <span>

              Modalità admin

            </span>

            <span className="text-emerald-600 font-semibold">

              Attiva

            </span>

          </div>

          <div className="flex items-center justify-between">

            <span>

              Database

            </span>

            <span className="text-emerald-600 font-semibold">

              Online

            </span>

          </div>

        </div>

      </div>

    </div>
  );
}
