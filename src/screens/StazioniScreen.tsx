import React, { useState, useEffect } from 'react';

import {
  Search,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  MessageSquarePlus,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { useSwipeDown } from '../lib/useSwipeDown';
import HotelSheet from '../components/HotelSheet';
import { useScrollLock } from '../lib/useScrollLock';

import { getDeviceId } from '../lib/device';

import {
  getFavorites,
  toggleFavorite,
} from '../lib/favorites';

import {
  getCurrentLocation,
  calculateDistance,
} from '../lib/location';

import type {
  StazioneWithSalette,
  AttivitaStazione,
} from '../lib/database.types';

import EmptyState from '../components/EmptyState';

import AddAttivitaModal from '../components/AddAttivitaModal';

import SkeletonCard from '../components/SkeletonCard';

import {
  getStatoApertura,
} from '../lib/getStatoApertura';

import {
  sortAttivita,
  SORT_OPTIONS,
  type SortMode,
} from '../lib/sortAttivita';

import AttivitaVerifica from '../components/AttivitaVerifica';

interface Props {

  refreshKey?: number;

  onNavigateToContributi?: () => void;

  /**
   * Se fornito, apre questa stazione al mount e fa scroll fino alla card.
   * Usato dalla Home → "Apri stazione".
   */
  initialExpandedId?: string | null;

  /**
   * Se fornito, pre-imposta il filtro categoria al mount.
   * Usato dalla Home → chip Attività / Hotel.
   * Valore speciale 'attivita' = nessun filtro (mostra tutto tranne Hotel).
   */
  initialCategoriaFilter?: string | null;
}

// =========================
// TIPI RATING
// =========================

interface Valutazione {

  id: string;

  voto: number;

  device_id: string;
}

export default function StazioniScreen({
  refreshKey = 0,
  onNavigateToContributi,
  initialExpandedId = null,
  initialCategoriaFilter = null,
}: Props) {

  const [stazioni, setStazioni] =
    useState<StazioneWithSalette[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [
    favoritesExpanded,
    setFavoritesExpanded,
  ] = useState(true);

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  // Ref per lo scroll automatico alla card espansa programmaticamente
  const expandedCardRef = React.useRef<HTMLDivElement | null>(null);
  // Garantisce che scrollIntoView venga eseguito una sola volta per ogni target,
  // anche se stazioni si aggiorna più volte (realtime, refresh, toggle preferiti)
  const scrollDone = React.useRef(false);

  // Al mount e quando initialExpandedId cambia: imposta espansione e filtro categoria.
  // Resetta scrollDone così il secondo useEffect eseguirà lo scroll per il nuovo target.
  useEffect(() => {
    if (!initialExpandedId) return;
    scrollDone.current = false;
    setExpandedId(initialExpandedId);

    if (initialCategoriaFilter && initialCategoriaFilter !== 'attivita') {
      setCategoriaFilters({ [initialExpandedId]: initialCategoriaFilter });
    }
  }, [initialExpandedId]);

  // Esegue scrollIntoView una sola volta, dopo che tutte le condizioni sono vere:
  // 1. initialExpandedId è presente
  // 2. expandedId corrisponde a initialExpandedId (espansione avvenuta)
  // 3. la lista stazioni è stata caricata (stazioni.length > 0)
  // 4. expandedCardRef.current non è null (card presente nel DOM)
  // 5. scrollDone.current è false (scroll non ancora eseguito per questo target)
  useEffect(() => {
    if (
      !scrollDone.current &&
      initialExpandedId &&
      expandedId === initialExpandedId &&
      stazioni.length > 0 &&
      expandedCardRef.current
    ) {
      // Porta il top della card a inizio viewport, poi sale di 80px
      // per mostrare il nome della stazione come feedback visivo all'utente
      expandedCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      // Offset: compensa NavBar (56px) + un respiro (24px) → nome visibile
      const scrollContainer = document.scrollingElement ?? window.document.documentElement;
      setTimeout(() => {
        scrollContainer.scrollBy({ top: -80, behavior: 'smooth' });
      }, 350);
      scrollDone.current = true;
    }
  }, [stazioni, expandedId, initialExpandedId]);

  const [
    addAttivitaStazioneId,
    setAddAttivitaStazioneId,
  ] = useState<string | null>(null);

  const [userLocation, setUserLocation] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  const [locationReady, setLocationReady] =
    useState(false);

  const [selectedAttivita, setSelectedAttivita] =
    useState<any>(null);

  const [selectedHotel, setSelectedHotel] =
    useState<any>(null);

  const [mediaRating, setMediaRating] =
    useState<number>(0);

  const [numeroVoti, setNumeroVoti] =
    useState<number>(0);

  const [mioVoto, setMioVoto] =
    useState<number>(0);

  // sortMode per stazione: Map<stazioneId, SortMode>
  const [sortModes, setSortModes] =
    useState<
      Record<string, SortMode>
    >({});

  // categoriaFilter per stazione: Map<stazioneId, string | null>
  const [categoriaFilters, setCategoriaFilters] =
    useState<
      Record<string, string | null>
    >({});

  function getCategoriaFilter(
    stazioneId: string
  ): string | null {

    return categoriaFilters[stazioneId] ?? null;
  }

  function setCategoriaFilterForStazione(
    stazioneId: string,
    cat: string | null
  ) {

    setCategoriaFilters((prev) => ({
      ...prev,
      [stazioneId]: cat,
    }));
  }

  function getSortMode(
    stazioneId: string
  ): SortMode {

    return (
      sortModes[stazioneId] ??
      'aperte'
    );
  }

  function setSortModeForStazione(
    stazioneId: string,
    mode: SortMode
  ) {

    setSortModes((prev) => ({
      ...prev,
      [stazioneId]: mode,
    }));
  }

  // =========================
  // LOAD
  // =========================

  async function load(
    silent = false
  ) {

    try {

      if (!silent) {

        setLoading(true);
      }

      const {
        data: stazioniData,
      } = await supabase
        .from('stazioni')
        .select('*');

      const {
        data: attivitaData,
      } = await supabase
        .from('attivita_stazione')
        .select('*')
        .eq('is_active', true);

      const {
        data: valutazioniData,
      } = await supabase
        .from('attivita_valutazioni')
        .select('*');

      const merged =
        (stazioniData ?? [])

          .filter(
            (s: any) => s.lat && s.lng
          )

          .map(
            (stazione: any) => {

              const attivita =
                (attivitaData ?? [])

                  .map(
                    (attivita: any) => {

                      const valutazioni =
                        (
                          valutazioniData ?? []
                        ).filter(
                          (v: any) =>
                            v.attivita_id ===
                            attivita.id
                        );

                      return {
                        ...attivita,
                        valutazioni,
                      };
                    }
                  )

                  .filter(
                    (a: AttivitaStazione) =>
                      a.stazione_id ===
                      stazione.id
                  )

                  .sort(
                    (a: any, b: any) => {

                      const mediaA =
                        a.valutazioni.length > 0
                          ? a.valutazioni.reduce(
                              (sum: number, v: any) =>
                                sum + v.voto,
                              0
                            ) /
                            a.valutazioni.length
                          : 0;

                      const mediaB =
                        b.valutazioni.length > 0
                          ? b.valutazioni.reduce(
                              (sum: number, v: any) =>
                                sum + v.voto,
                              0
                            ) /
                            b.valutazioni.length
                          : 0;

                      return mediaB - mediaA;
                    }
                  );

              return {
                ...stazione,
                salette: [],
                attivita_stazione: attivita,
              };
            }
          )

          .sort(
            (a: any, b: any) => {

              const aFav =
                favorites.includes(a.id);

              const bFav =
                favorites.includes(b.id);

              if (aFav && !bFav) return -1;
              if (!aFav && bFav) return 1;

              if (
                userLocation &&
                a.lat && a.lng &&
                b.lat && b.lng
              ) {

                const aDist =
                  calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    Number(a.lat),
                    Number(a.lng)
                  );

                const bDist =
                  calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    Number(b.lat),
                    Number(b.lng)
                  );

                return aDist - bDist;
              }

              return a.nome.localeCompare(
                b.nome,
                'it'
              );
            }
          );

      setStazioni(merged);

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore caricamento stazioni'
      );

    } finally {

      setLoading(false);
    }
  }

  // =========================
  // LOAD RATING
  // =========================

  async function loadRating(
    attivitaId: string
  ) {

    const { data, error } =
      await supabase
        .from('attivita_valutazioni')
        .select('*')
        .eq('attivita_id', attivitaId);

    if (error) {

      console.error(error);

      return;
    }

    const voti =
      (data ?? []) as Valutazione[];

    const media =
      voti.length > 0
        ? voti.reduce(
            (sum, v) => sum + v.voto,
            0
          ) / voti.length
        : 0;

    setMediaRating(media);

    setNumeroVoti(voti.length);

    const mioRecord = voti.find(
      (v) => v.device_id === getDeviceId()
    );

    setMioVoto(mioRecord?.voto || 0);
  }

  // =========================
  // VOTE
  // =========================

  async function voteAttivita(
    voto: number
  ) {

    if (!selectedAttivita) return;

    const { error } =
      await supabase
        .from('attivita_valutazioni')
        .upsert(
          {
            attivita_id:
              selectedAttivita.id,
            device_id: getDeviceId(),
            voto,
          },
          {
            onConflict:
              'attivita_id,device_id',
          }
        );

    if (error) {

      console.error(error);

      return;
    }

    setMioVoto(voto);

    await loadRating(
      selectedAttivita.id
    );
  }

  // =========================
  // INIT GEOLOCATION
  // =========================

  useEffect(() => {

    const favs = getFavorites();

    setFavorites(favs);

    async function initLocation() {

      try {

        const location =
          await getCurrentLocation();

        setUserLocation(location);

      } catch {

        console.warn(
          'Geolocalizzazione non disponibile'
        );

      } finally {

        setLocationReady(true);
      }
    }

    initLocation();

  }, []);

  // =========================
  // GLOBAL REFRESH
  // =========================

  useEffect(() => {

    if (!locationReady) return;

    load();

  }, [
    favorites,
    userLocation,
    locationReady,
    refreshKey,
  ]);

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

    const channel =
      supabase
        .channel('realtime-stazioni')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stazioni',
          },
          () => {
            load(true);
            toast.success(
              'Stazioni aggiornate'
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attivita_stazione',
          },
          () => {
            load(true);
            toast.success(
              'Nuova attività disponibile'
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attivita_valutazioni',
          },
          () => { load(true); }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  // =========================
  // FILTER
  // =========================

  const filtered =
    [...stazioni].filter((s) => {

      const q = search.toLowerCase();

      return (
        !q ||
        s.nome?.toLowerCase().includes(q) ||
        s.codice?.toLowerCase().includes(q)
      );
    });

  const favoriteStations =
    filtered.filter(
      (s) => favorites.includes(s.id)
    );

  const normalStations =
    filtered.filter(
      (s) => !favorites.includes(s.id)
    );

  // =========================
  // CARD
  // =========================

  function renderStationCard(
    stazione: any,
    isNearest = false
  ) {

    const expanded =
      expandedId === stazione.id;

    const distance =
      userLocation &&
      stazione.lat &&
      stazione.lng
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(stazione.lat),
            Number(stazione.lng)
          )
        : null;

    return (

      <div
        key={stazione.id}
        ref={stazione.id === initialExpandedId ? expandedCardRef : null}
        className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
          isNearest
            ? 'border-trenord-green ring-2 ring-trenord-green/20'
            : 'border-gray-100'
        }`}
      >

        {/* HEADER */}
        <div
          onClick={() =>
            setExpandedId(
              expanded ? null : stazione.id
            )
          }
          className="p-5 cursor-pointer"
        >

          <div className="flex items-start justify-between gap-3">

            <div>

              <h2 className="text-xl font-bold text-gray-900">

                {stazione.nome}

              </h2>

              {isNearest && (

                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-xs font-semibold">

                  📍 Più vicina

                </div>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">

                <p className="text-sm text-gray-400">

                  {stazione.provincia} • {stazione.regione}

                </p>

                {distance && (

                  <span className="text-xs px-2 py-1 rounded-full bg-trenord-green/10 text-trenord-green font-medium">

                    {distance.toFixed(1)} km

                  </span>
                )}

              </div>

            </div>

            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">

              {expanded ? (

                <ChevronUp className="w-5 h-5 text-gray-400" />

              ) : (

                <ChevronDown className="w-5 h-5 text-gray-400" />

              )}

            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">

            {/* FAVORITE */}
            <button
              onClick={(e) => {

                e.stopPropagation();

                const updated =
                  toggleFavorite(stazione.id);

                setFavorites(updated);

                toast.success(
                  favorites.includes(stazione.id)
                    ? 'Rimosso dai preferiti'
                    : 'Aggiunto ai preferiti'
                );
              }}
              className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center"
            >

              <Star
                className={`w-5 h-5 ${
                  favorites.includes(stazione.id)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-yellow-400'
                }`}
              />

            </button>

            {/* MAPS */}
            {stazione.maps_query && (

              <button
                onClick={(e) => {

                  e.stopPropagation();

                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      stazione.maps_query
                    )}`,
                    '_blank'
                  );
                }}
                className="px-3 h-10 rounded-2xl bg-trenord-green text-white flex items-center gap-2 text-sm font-medium shadow-sm"
              >

                <MapPin className="w-4 h-4" />

                Portami qui

              </button>
            )}

          </div>

        </div>

        {/* EXPANDED */}
        {expanded && (

          <div className="border-t border-gray-100 p-5 flex flex-col gap-4 bg-gray-50">

            {/* ADD */}
            <button
              onClick={() =>
                setAddAttivitaStazioneId(
                  stazione.id
                )
              }
              className="px-3 h-10 rounded-2xl bg-white border border-gray-200 text-gray-700 flex items-center gap-2 text-sm font-medium shadow-sm w-fit"
            >

              <Plus className="w-4 h-4" />

              Aggiungi attività

            </button>

            {/* ATTIVITA */}
            {stazione.attivita_stazione &&
              stazione.attivita_stazione
                .length > 0 && (

              <div className="flex flex-col gap-3">

                {/* SORT BUTTONS */}
                <div className="flex gap-2 flex-wrap">

                  {SORT_OPTIONS.map(
                    (opt) => (

                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() =>
                          setSortModeForStazione(
                            stazione.id,
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
                            getSortMode(
                              stazione.id
                            ) === opt.mode
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
                {(() => {

                  const cats = Array.from(
                    new Set(
                      stazione.attivita_stazione
                        .filter((a: any) => a.categoria)
                        .map((a: any) => a.categoria as string)
                    )
                  ).sort((a, b) =>
                    a.localeCompare(b, 'it')
                  );

                  if (cats.length <= 1) return null;

                  return (

                    <div className="flex gap-2 flex-wrap">

                      {cats.map((cat) => (

                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setCategoriaFilterForStazione(
                              stazione.id,
                              getCategoriaFilter(stazione.id) === cat
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
                              getCategoriaFilter(stazione.id) === cat
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-600 hover:text-gray-900'
                            }
                          `}
                        >

                          {cat}

                        </button>
                      ))}

                    </div>
                  );
                })()}

                {sortAttivita(
                  getCategoriaFilter(stazione.id)
                    ? stazione.attivita_stazione.filter(
                        (a: any) =>
                          a.categoria ===
                          getCategoriaFilter(stazione.id)
                      )
                    : stazione.attivita_stazione,
                  getSortMode(stazione.id)
                ).map(
                  (attivita: any) => {

                    const stato =
                      getStatoApertura(
                        attivita
                      );

                    return (

                      <React.Fragment key={attivita.id}>

                      <button
                        type="button"
                        onClick={() => {
                          if (attivita.categoria === 'Hotel') {
                            setSelectedHotel(attivita);
                          } else {
                            setSelectedAttivita(attivita);
                            loadRating(attivita.id);
                          }
                        }}
                        className="
                          w-full
                          bg-white
                          rounded-xl
                          p-4
                          border
                          text-left
                          hover:bg-gray-50
                          transition
                        "
                      >

                        <div className="flex items-center justify-between">

                          <div>

                            <h3 className="font-semibold text-gray-900">

                              {attivita.nome}

                            </h3>

                            <p className="text-sm text-gray-500">

                              {attivita.categoria}

                            </p>

                            {attivita.distanza_piedi && (

                              <div className="text-xs text-gray-500 mt-1">

                                🚶 {attivita.distanza_piedi}

                              </div>
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

                            {attivita.valutazioni &&
                              attivita.valutazioni
                                .length > 0 && (

                              <div className="flex items-center gap-1 mt-2">

                                <Star
                                  className="
                                    w-4 h-4
                                    fill-yellow-400
                                    text-yellow-400
                                  "
                                />

                                <span className="text-sm font-medium">

                                  {(
                                    attivita.valutazioni.reduce(
                                      (
                                        sum: number,
                                        v: any
                                      ) =>
                                        sum + v.voto,
                                      0
                                    ) /
                                    attivita.valutazioni
                                      .length
                                  ).toFixed(1)}

                                </span>

                                <span className="text-xs text-gray-400">

                                  (
                                  {
                                    attivita
                                      .valutazioni
                                      .length
                                  }
                                  )

                                </span>

                              </div>
                            )}

                          </div>

                          {attivita.convenzionato && (

                            <span
                              className="
                                text-xs
                                bg-green-100
                                text-green-700
                                px-2
                                py-1
                                rounded-full
                              "
                            >
                              Convenzionato
                            </span>
                          )}

                        </div>

                      </button>

                      {/* VERIFICA ATTIVITA */}
                      <div className="px-4 pb-3 bg-white rounded-b-2xl border border-t-0 border-gray-200 -mt-2">

                        <AttivitaVerifica
                          attivitaId={attivita.id}
                        />

                      </div>

                      </React.Fragment>

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

  // ─── Componente inner: sheet attività con scroll lock e swipe-down ───────
  function AttivitaSheet({
    onClose,
    children,
  }: {
    onClose: () => void;
    children: React.ReactNode;
  }) {
    useScrollLock();
    const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });

    return (
      <div
        className="fixed inset-0 bg-black/40 z-[9999] flex items-end"
        onClick={onClose}
      >
        <div
          ref={panelRef}
          style={dragStyle}
          className="bg-white w-full rounded-t-3xl flex flex-col max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* DRAG HANDLE */}
          <div
            onTouchStart={handleDragStart}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            {/* HEADER con X */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 truncate pr-4">
                {selectedAttivita?.nome}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          {/* BODY SCROLLABILE */}
          <div className="overflow-y-auto flex-1 px-6 pb-8 pt-4">
            {children}
          </div>
        </div>
      </div>
    );
  }


  return (

    <>
      <div className="flex flex-col gap-4">

        {/* SEARCH */}
        <div className="relative">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Cerca stazione..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-9 py-3 text-base"
          />

          {search.length > 0 && (

            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >

              <X className="w-4 h-4 text-gray-400" />

            </button>
          )}

        </div>

        {/* LOADING */}
        {(loading || !locationReady) && (

          <div className="flex flex-col gap-3">

            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />

          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          filtered.length === 0 && (

          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">

            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-400" />
            </div>

            <div>
              <p className="font-semibold text-gray-700">

                Nessuna stazione trovata

              </p>

              <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">

                Nessun risultato per "{search}". La stazione non è ancora in elenco?

              </p>
            </div>

            <button
              onClick={() => setSearch('')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
            >

              <X className="w-4 h-4" />

              Cancella ricerca

            </button>

            <button
              onClick={() => onNavigateToContributi?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >

              <MessageSquarePlus className="w-4 h-4" />

              Segnala stazione mancante

            </button>

          </div>
        )}

        {/* FAVORITES */}
        {!loading &&
          favoriteStations.length > 0 && (

          <div className="flex flex-col gap-3">

            <button
              onClick={() =>
                setFavoritesExpanded(
                  !favoritesExpanded
                )
              }
              className="flex items-center justify-between"
            >

              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">

                Preferiti

              </h2>

              {favoritesExpanded ? (

                <ChevronUp className="w-4 h-4 text-gray-400" />

              ) : (

                <ChevronDown className="w-4 h-4 text-gray-400" />

              )}

            </button>

            {favoritesExpanded &&
              favoriteStations.map(
                (station) =>
                  renderStationCard(station)
              )}

          </div>
        )}

        {/* STATIONS */}
        {!loading && (

          <div className="flex flex-col gap-3">

            {normalStations.map(
              (station, index) =>
                renderStationCard(
                  station,
                  index === 0
                )
            )}

          </div>
        )}

      </div>

      {/* MODAL AGGIUNGI */}
      {addAttivitaStazioneId && (

        <AddAttivitaModal
          stazioneId={
            addAttivitaStazioneId
          }
          onClose={() =>
            setAddAttivitaStazioneId(null)
          }
          onSuccess={() => {

            setAddAttivitaStazioneId(null);

            load(true);
          }}
        />
      )}

      {/* DETTAGLIO ATTIVITA */}
      {selectedHotel && (
        <HotelSheet
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
        />
      )}

      {selectedAttivita && (
        <AttivitaSheet
          onClose={() => setSelectedAttivita(null)}
        >

            <p className="text-gray-500 mb-3">

              {selectedAttivita.categoria}

            </p>

            {/* STATO APERTURA NEL MODAL */}
            {(() => {

              const stato =
                getStatoApertura(
                  selectedAttivita
                );

              return (

                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-gray-50 w-fit">

                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      stato.aperto
                        ? 'bg-emerald-500'
                        : 'bg-red-400'
                    }`}
                  />

                  <span
                    className={`text-sm font-semibold ${
                      stato.aperto
                        ? 'text-emerald-700'
                        : 'text-red-500'
                    }`}
                  >

                    {stato.aperto
                      ? 'Aperto ora'
                      : 'Chiuso'}

                  </span>

                  <span className="text-sm text-gray-500">

                    · {stato.testo}

                  </span>

                </div>
              );
            })()}

            {selectedAttivita.distanza_piedi && (

              <div className="flex items-center gap-2 text-gray-600 mb-4">

                <span>🚶</span>

                <span>
                  {selectedAttivita.distanza_piedi}
                </span>

              </div>
            )}

            <div className="mt-4">

              <div className="flex items-center gap-2">

                <Star
                  className="
                    w-5 h-5
                    fill-yellow-400
                    text-yellow-400
                  "
                />

                <span className="font-medium">

                  {mediaRating.toFixed(1)}

                </span>

                <span className="text-gray-500">

                  ({numeroVoti} voti)

                </span>

              </div>

              <div className="mt-3">

                <p className="text-sm text-gray-500 mb-2">

                  La tua valutazione

                </p>

                <div className="flex gap-2">

                  {[1, 2, 3, 4, 5].map(
                    (numero) => (

                      <button
                        key={numero}
                        type="button"
                        onClick={() =>
                          voteAttivita(numero)
                        }
                      >

                        <Star
                          className={`
                            w-7 h-7
                            ${
                              numero <= mioVoto
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }
                          `}
                        />

                      </button>
                    )
                  )}

                </div>

              </div>

            </div>

            <div className="border-t my-4" />

            {selectedAttivita.convenzionato && (

              <div
                className="
                  inline-flex
                  px-3
                  py-1
                  rounded-full
                  bg-green-100
                  text-green-700
                  text-sm
                  mb-4
                "
              >
                Convenzionato Trenord
              </div>
            )}

            {selectedAttivita.ubicazione && (

              <div className="mb-3">

                <h3 className="font-semibold">
                  Ubicazione
                </h3>

                <p>
                  {selectedAttivita.ubicazione}
                </p>

              </div>
            )}

            {selectedAttivita.indirizzo && (

              <div className="mb-3">

                <h3 className="font-semibold">
                  Indirizzo
                </h3>

                <p>
                  {selectedAttivita.indirizzo}
                </p>

              </div>
            )}

            {selectedAttivita.maps_query && (

              <button
                type="button"
                onClick={() => {

                  const query =
                    encodeURIComponent(
                      selectedAttivita.maps_query
                    );

                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${query}`,
                    '_blank'
                  );
                }}
                className="
                  w-full
                  h-12
                  rounded-xl
                  bg-blue-600
                  text-white
                  font-medium
                  mb-4
                "
              >

                📍 Apri Navigazione

              </button>
            )}

            {/* FASCE ORARIE NEL MODAL */}
            {Array.isArray(
              selectedAttivita.fasce_orarie
            ) &&
              selectedAttivita.fasce_orarie
                .length > 0 && (

              <div className="mb-4">

                <h3 className="font-semibold mb-2">

                  🕒 Orari

                </h3>

                <div className="flex flex-col gap-2">

                  {selectedAttivita.fasce_orarie.map(
                    (
                      fascia: any,
                      index: number
                    ) => (

                      <div
                        key={index}
                        className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700"
                      >

                        <div className="font-medium">

                          {Array.isArray(
                            fascia.giorni
                          )
                            ? fascia.giorni.join(
                                ', '
                              )
                            : ''}

                        </div>

                        <div className="text-gray-500">

                          {fascia.apertura} →{' '}
                          {fascia.chiusura}

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {selectedAttivita.note && (

              <div className="mb-3">

                <h3 className="font-semibold">
                  Note
                </h3>

                <p>
                  {selectedAttivita.note}
                </p>

              </div>
            )}

        </AttivitaSheet>
      )}

    </>
  );
}
