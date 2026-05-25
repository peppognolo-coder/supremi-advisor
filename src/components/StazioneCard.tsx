import {
  useState,
  useEffect,
} from 'react';

import {
  MapPin,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Navigation,
  Star,
  Plus,
  Store,
  Clock3,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import type {
  StazioneWithSalette,
} from '../lib/database.types';

import SalettaCard from './SalettaCard';

import ContributoAttivitaForm from '../screens/contributi/ContributoAttivitaForm';

import {
  getFavorites,
  toggleFavorite,
} from '../lib/favorites';

import {
  getStatoApertura,
} from '../lib/getStatoApertura';

import {
  sortAttivita,
  SORT_OPTIONS,
  type SortMode,
} from '../lib/sortAttivita';

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

  const [sortMode, setSortMode] =
    useState<SortMode>('aperte');

  const [categoriaFilter, setCategoriaFilter] =
    useState<string | null>(null);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [favorites, setFavorites] =
    useState<string[]>(
      getFavorites()
    );

  const [
    liveStazione,
    setLiveStazione,
  ] =
    useState<StazioneWithSalette>(
      stazione
    );

  // =========================
  // RELOAD
  // =========================

  async function reloadStation() {

    const {
      data: stationData,
      error: stationError,
    } = await supabase
      .from('stazioni')
      .select(`
        *,
        salette (*)
      `)
      .eq('id', stazione.id)
      .single();

    if (stationError) {

      console.error(stationError);

      return;
    }

    const {
      data: attivitaData,
      error: attivitaError,
    } = await supabase
      .from('attivita_stazione')
      .select('*')
      .eq('stazione_id', stazione.id)
      .eq('is_active', true);

    if (attivitaError) {

      console.error(attivitaError);
    }

    setLiveStazione({

      ...stationData,

      salette:
        Array.isArray(
          stationData?.salette
        )
          ? stationData.salette
          : [],

      attivita_stazione:
        Array.isArray(attivitaData)
          ? attivitaData
          : [],
    });
  }

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

    reloadStation();

    const channel =
      supabase
        .channel(
          `station-${stazione.id}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attivita_stazione',
          },
          () => { reloadStation(); }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'salette',
          },
          () => { reloadStation(); }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [stazione.id]);

  // =========================
  // DATA
  // =========================

  const salette =
    Array.isArray(liveStazione?.salette)
      ? liveStazione.salette
      : [];

  const locali =
    Array.isArray(
      liveStazione?.attivita_stazione
    )
      ? liveStazione.attivita_stazione
      : [];

  // Categorie disponibili in questa stazione (deduplicate, ordinate)
  const categorieDisponibili: string[] = Array.from(
    new Set(
      locali
        .filter((l: any) => l.categoria)
        .map((l: any) => l.categoria as string)
    )
  ).sort((a, b) => a.localeCompare(b, 'it'));

  console.log('[StazioneCard] locali:', locali.length, 'categorie:', categorieDisponibili);

  // Locali filtrati per categoria (poi ordinati dal sortAttivita)
  const localiFiltrati =
    categoriaFilter
      ? locali.filter(
          (l: any) => l.categoria === categoriaFilter
        )
      : locali;

  const aperte =
    salette.filter(
      (s) => s.stato === 'aperta'
    ).length;

  const isFavorite =
    favorites.includes(liveStazione.id);

  // =========================
  // FAVORITE
  // =========================

  function handleFavorite(
    e: React.MouseEvent
  ) {

    e.stopPropagation();

    const updated =
      toggleFavorite(liveStazione.id);

    setFavorites(updated);
  }

  // =========================
  // EXPAND
  // =========================

  function handleExpand() {

    setExpanded(!expanded);
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
            type="button"
            onClick={(e) => {

              e.stopPropagation();

              setShowAddForm(!showAddForm);
            }}
            className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
          >

            <Plus className="w-4 h-4" />

            {showAddForm
              ? 'Chiudi form'
              : 'Aggiungi attività'}

          </button>

          {/* FORM */}
          {showAddForm && (

            <div className="bg-white border border-gray-200 rounded-2xl p-4">

              <ContributoAttivitaForm
                stazionePredefinitaId={
                  liveStazione.id
                }
                onBack={() =>
                  setShowAddForm(false)
                }
              />

            </div>
          )}

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

              {/* SORT BUTTONS */}
              <div className="flex gap-2 flex-wrap">

                {SORT_OPTIONS.map(
                  (opt) => (

                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() =>
                        setSortMode(
                          opt.mode
                        )
                      }
                      className={`
                        flex
                        items-center
                        gap-1
                        px-3
                        py-1.5
                        rounded-xl
                        text-xs
                        font-medium
                        border
                        transition-colors
                        ${
                          sortMode ===
                          opt.mode
                            ? 'bg-trenord-green text-white border-trenord-green'
                            : 'bg-white text-gray-900 border-gray-300 hover:border-trenord-green hover:text-trenord-green'
                        }
                      `}
                    >

                      <span>
                        {opt.emoji}
                      </span>

                      <span>
                        {opt.label}
                      </span>

                    </button>
                  )
                )}

              </div>

              {/* CATEGORIA FILTER */}
              {categorieDisponibili.length > 1 && (

                <div className="flex gap-2 flex-wrap">

                  {categorieDisponibili.map(
                    (cat) => (

                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setCategoriaFilter(
                            categoriaFilter === cat
                              ? null
                              : cat
                          )
                        }
                        className={`
                          px-3
                          py-1.5
                          rounded-xl
                          text-xs
                          font-medium
                          border
                          transition-colors
                          ${
                            categoriaFilter === cat
                              ? 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-900 border-gray-300 hover:border-gray-600 hover:text-gray-900'
                          }
                        `}
                      >

                        {cat}

                      </button>
                    )
                  )}

                </div>
              )}

              {sortAttivita(
                localiFiltrati,
                sortMode
              ).map(
                (locale: any) => {

                  const stato =
                    getStatoApertura(
                      locale
                    );

                  return (

                    <div
                      key={locale.id}
                      className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="flex items-center gap-2 flex-wrap">

                            <h5 className="font-semibold text-gray-900">

                              {locale.nome}

                            </h5>

                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">

                              {locale.categoria}

                            </span>

                          </div>

                          {locale.indirizzo && (

                            <p className="text-sm text-gray-500 mt-1">

                              {locale.indirizzo}

                            </p>
                          )}

                          {/* STATO APERTURA */}
                          <div className="flex items-center gap-1.5 mt-2">

                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                stato.aperto
                                  ? 'bg-emerald-500'
                                  : 'bg-red-400'
                              }`}
                            />

                            <span
                              className={`text-xs font-medium ${
                                stato.aperto
                                  ? 'text-emerald-700'
                                  : 'text-red-500'
                              }`}
                            >

                              {stato.aperto
                                ? 'Aperto ora'
                                : 'Chiuso'}

                            </span>

                            <span className="text-xs text-gray-400">

                              · {stato.testo}

                            </span>

                          </div>

                        </div>

                        {locale.convenzionato && (

                          <div className="px-2 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-xs font-semibold whitespace-nowrap">

                            Convenzionato

                          </div>
                        )}

                      </div>

                      {locale.ubicazione && (

                        <div className="text-xs text-gray-500">

                          📍 {locale.ubicazione}

                        </div>
                      )}

                      {/* FASCE ORARIE */}
                      {Array.isArray(
                        locale.fasce_orarie
                      ) &&
                        locale.fasce_orarie.length > 0 && (

                        <div className="flex flex-col gap-2">

                          {locale.fasce_orarie.map(
                            (
                              fascia: any,
                              index: number
                            ) => (

                              <div
                                key={index}
                                className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600"
                              >

                                <div className="flex items-center gap-2 mb-1">

                                  <Clock3 className="w-3.5 h-3.5" />

                                  <span className="font-medium">

                                    {fascia.apertura} - {fascia.chiusura}

                                  </span>

                                </div>

                                <div>

                                  {Array.isArray(fascia.giorni)
                                    ? fascia.giorni.join(', ')
                                    : ''}

                                </div>

                              </div>
                            )
                          )}

                        </div>
                      )}

                      {locale.note && (

                        <div className="text-xs text-gray-400 italic">

                          {locale.note}

                        </div>
                      )}

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          locale.maps_query ||
                          locale.nome
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >

                        <Store className="w-4 h-4" />

                        Apri su Maps

                      </a>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}