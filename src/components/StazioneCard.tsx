import { useState, useEffect } from 'react';

import {
  MapPin,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Navigation,
  Star,
  Plus,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import type {
  StazioneWithSalette,
} from '../lib/database.types';

import SalettaCard from './SalettaCard';
import LocaleCard from './LocaleCard';

import ContributoAttivitaForm from '../screens/contributi/ContributoAttivitaForm';

import {
  getFavorites,
  toggleFavorite,
} from '../lib/favorites';

interface StazioneCardProps {

  stazione: StazioneWithSalette;

  isNearest?: boolean;
}

export default function StazioneCard({
  stazione,
  isNearest = false,
}: StazioneCardProps) {

  const [expanded, setExpanded] =
    useState(false);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [favorites, setFavorites] =
    useState<string[]>(
      getFavorites()
    );

  // =========================
  // LIVE DATA
  // =========================

  const [
    liveStazione,
    setLiveStazione,
  ] =
    useState<StazioneWithSalette>(
      stazione
    );

  // =========================
  // REALTIME REFRESH
  // =========================

  useEffect(() => {

    async function reloadStation() {

      // =====================
      // STAZIONE + SALETTE
      // =====================

      const {
        data: stationData,
        error: stationError,
      } = await supabase

        .from('stazioni')

        .select(`
          *,
          salette (*)
        `)

        .eq(
          'id',
          stazione.id
        )

        .single();

      if (stationError) {

        console.error(
          stationError
        );

        return;
      }

      // =====================
      // ATTIVITA
      // =====================

      const {
        data: attivitaData,
        error: attivitaError,
      } = await supabase

        .from(
          'attivita_stazione'
        )

        .select('*')

        .eq(
          'stazione_id',
          stazione.id
        );

      if (attivitaError) {

        console.error(
          attivitaError
        );
      }

      // =====================
      // MERGE
      // =====================

      setLiveStazione({

        ...stationData,

        salette:
          stationData?.salette || [],

        attivita_stazione:
          attivitaData || [],
      });
    }

    // primo load reale
    reloadStation();

    const channel =
      supabase

        .channel(
          `station-${stazione.id}`
        )

        // =====================
        // ATTIVITA
        // =====================

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'attivita_stazione',
          },

          (payload) => {

            const row =
              payload.new as any;

            if (
              row?.stazione_id ===
              stazione.id
            ) {

              reloadStation();
            }
          }
        )

        // =====================
        // SALETTE
        // =====================

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table: 'salette',
          },

          (payload) => {

            const row =
              payload.new as any;

            if (
              row?.stazione_id ===
              stazione.id
            ) {

              reloadStation();
            }
          }
        )

        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );
    };

  }, [stazione.id]);

  // =========================
  // DATA
  // =========================

  const salette =
    liveStazione.salette ??
    [];

  const locali =
    liveStazione
      .attivita_stazione ??
    [];

  const aperte =
    salette.filter(
      (s) =>
        s.stato ===
        'aperta'
    ).length;

  const isFavorite =
    favorites.includes(
      liveStazione.id
    );

  // =========================
  // FAVORITE
  // =========================

  function handleFavorite(
    e: React.MouseEvent
  ) {

    e.stopPropagation();

    const updated =
      toggleFavorite(
        liveStazione.id
      );

    setFavorites(updated);
  }

  // =========================
  // EXPAND
  // =========================

  function handleExpand() {

    setExpanded(
      !expanded
    );
  }

  // =========================
  // FORM MODE
  // =========================

  if (showAddForm) {

    return (

      <ContributoAttivitaForm

        stazionePredefinitaId={
          liveStazione.id
        }

        onBack={() =>
          setShowAddForm(
            false
          )
        }
      />
    );
  }

  return (

    <div
      className={`bg-white rounded-3xl shadow-sm border transition-all duration-200 hover:shadow-md overflow-hidden ${
        isNearest
          ? 'border-trenord-green ring-2 ring-trenord-green/20'
          : liveStazione.attiva
          ? 'border-gray-100'
          : 'border-dashed border-gray-200 opacity-60'
      }`}
    >

      {/* HEADER */}
      <div className="p-5 flex flex-col gap-4">

        {/* TOP */}
        <div
          onClick={handleExpand}
          className="flex items-start justify-between gap-3 cursor-pointer"
        >

          {/* LEFT */}
          <div className="flex items-start gap-3 flex-1 min-w-0">

            {/* ICON */}
            <div
              className={`flex-shrink-0 mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${
                liveStazione.attiva
                  ? 'bg-trenord-green/10'
                  : 'bg-gray-100'
              }`}
            >

              <MapPin
                className={`w-5 h-5 ${
                  liveStazione.attiva
                    ? 'text-trenord-green'
                    : 'text-gray-400'
                }`}
              />

            </div>

            {/* CONTENT */}
            <div className="flex-1 min-w-0">

              <div className="flex items-center gap-2 flex-wrap">

                <h2 className="font-bold text-gray-900 text-lg leading-tight">

                  {liveStazione.nome}

                </h2>

                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">

                  {liveStazione.codice}

                </span>

              </div>

              <p className="text-sm text-gray-400 mt-1">

                {liveStazione.provincia}, {liveStazione.regione}

              </p>

              {/* NEAREST */}
              {isNearest && (

                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-xs font-semibold">

                  📍 Più vicina

                </div>
              )}

              {/* INFO */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">

                {/* SALETTE */}
                <div className="flex items-center gap-1 text-gray-500">

                  <DoorOpen className="w-3.5 h-3.5" />

                  <span className="text-xs">

                    {salette.length}{' '}
                    {salette.length === 1
                      ? 'saletta'
                      : 'salette'}

                  </span>

                </div>

                {/* APERTE */}
                {salette.length > 0 && (

                  <span
                    className={`text-xs font-medium ${
                      aperte > 0
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}
                  >

                    {aperte} aperte

                  </span>
                )}

                {/* LOCALI */}
                {locali.length > 0 && (

                  <span className="text-xs font-medium text-trenord-green">

                    {locali.length} locali

                  </span>
                )}

              </div>

            </div>

          </div>

          {/* EXPAND */}
          <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">

            {expanded ? (

              <ChevronUp className="w-5 h-5 text-gray-400" />

            ) : (

              <ChevronDown className="w-5 h-5 text-gray-400" />

            )}

          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* FAVORITE */}
          <button
            onClick={handleFavorite}
            className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center"
          >

            <Star
              className={`w-5 h-5 ${
                isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-yellow-400'
              }`}
            />

          </button>

          {/* MAPS */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              liveStazione.maps_query ||
              liveStazione.nome
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) =>
              e.stopPropagation()
            }
            className="px-4 h-10 rounded-2xl bg-trenord-green text-white flex items-center gap-2 text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
          >

            <Navigation className="w-4 h-4" />

            Portami qui

          </a>

        </div>

      </div>

      {/* EXPANDED */}
      {expanded && (

        <div className="border-t border-gray-100 p-5 flex flex-col gap-4 bg-gray-50 animate-in slide-in-from-top-1 duration-150">

          {/* ADD */}
          <button
            onClick={() =>
              setShowAddForm(
                true
              )
            }
            className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
          >

            <Plus className="w-4 h-4" />

            Aggiungi attività

          </button>

          {/* NOTE */}
          {liveStazione.note && (

            <p className="text-xs text-gray-400 italic">

              {liveStazione.note}

            </p>
          )}

          {/* SALETTE */}
          {salette.length === 0 ? (

            <p className="text-sm text-gray-400 text-center py-3">

              Nessuna saletta registrata

            </p>

          ) : (

            <div className="flex flex-col gap-3">

              {salette.map(
                (saletta) => (

                  <SalettaCard
                    key={saletta.id}
                    saletta={saletta}
                  />

                )
              )}

            </div>

          )}

          {/* LOCALI */}
          {locali.length > 0 && (

            <div className="flex flex-col gap-3 mt-2">

              <div className="flex items-center justify-between">

                <h4 className="text-sm font-semibold text-gray-800">

                  Locali nelle vicinanze

                </h4>

                <span className="text-xs text-gray-400">

                  {locali.length} locali

                </span>

              </div>

              {locali.map(
                (locale) => (

                  <LocaleCard
                    key={locale.id}
                    locale={locale}
                  />

                )
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}