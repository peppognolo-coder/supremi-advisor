import { useState, useEffect } from 'react';

import {
  Search,
  MapPin,
  Coffee,
  Pill,
  ShoppingCart,
  Cigarette,
  Store,
  Star,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

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

import AttivitaCard from '../components/Stazioni/AttivitaCard';

function getCategoriaIcon(
  categoria: string
) {

  switch (categoria) {

    case 'bar':
      return Coffee;

    case 'fast_food':
      return Store;

    case 'supermercato':
      return ShoppingCart;

    case 'farmacia':
      return Pill;

    case 'tabacchi':
      return Cigarette;

    default:
      return Store;
  }
}

interface Props {

  refreshKey?: number;
}

export default function StazioniScreen({
  refreshKey = 0,
}: Props) {

  const [stazioni, setStazioni] =
    useState<
      StazioneWithSalette[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [favoritesExpanded, setFavoritesExpanded] =
    useState(true);

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

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
        .select('*');

      const {
        data: valutazioniData,
      } = await supabase
        .from(
          'attivita_valutazioni'
        )
        .select('*');

      const merged =
        (stazioniData ?? [])

          // rimuovi stazioni senza coordinate
          .filter(
            (s: any) =>
              s.lat &&
              s.lng
          )

          .map(
            (stazione: any) => {

              const attivita =
                (
                  attivitaData ?? []
                )

                  .map(
                    (
                      attivita: any
                    ) => {

                      const valutazioni =
                        (
                          valutazioniData ??
                          []
                        ).filter(
                          (
                            valutazione: any
                          ) =>
                            valutazione.attivita_id ===
                            attivita.id
                        );

                      return {
                        ...attivita,
                        valutazioni,
                      };
                    }
                  )

                  .filter(
                    (
                      attivita: AttivitaStazione
                    ) =>
                      attivita.stazione_id ===
                      stazione.id
                  );

              return {
                ...stazione,
                salette: [],
                attivita_stazione:
                  attivita,
              };
            }
          )

          // SORT
          .sort((a: any, b: any) => {

            // FAVORITES FIRST
            const aFav =
              favorites.includes(
                a.id
              );

            const bFav =
              favorites.includes(
                b.id
              );

            if (
              aFav &&
              !bFav
            )
              return -1;

            if (
              !aFav &&
              bFav
            )
              return 1;

            // NEAREST
            if (
              userLocation &&
              a.lat &&
              a.lng &&
              b.lat &&
              b.lng
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

              return (
                aDist - bDist
              );
            }

            // ALPHABETIC
            return a.nome.localeCompare(
              b.nome,
              'it'
            );
          });

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
  // INIT GEOLOCATION
  // =========================

  useEffect(() => {

    const favs =
      getFavorites();

    setFavorites(favs);

    async function initLocation() {

      try {

        const location =
          await getCurrentLocation();

        setUserLocation(
          location
        );

      } catch {

        console.log(
          'Geolocalizzazione non disponibile'
        );

      } finally {

        setLocationReady(
          true
        );
      }
    }

    initLocation();

  }, []);

  // =========================
  // GLOBAL REFRESH
  // =========================

  useEffect(() => {

    // aspetta geolocalizzazione
    if (!locationReady)
      return;

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

        .channel(
          'realtime-stazioni'
        )

        // STAZIONI
        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table: 'stazioni',
          },

          () => {

            console.log(
              'Realtime stazioni'
            );

            load(true);

            toast.success(
              'Stazioni aggiornate'
            );
          }
        )

        // ATTIVITA
        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'attivita_stazione',
          },

          () => {

            console.log(
              'Realtime attività'
            );

            load(true);

            toast.success(
              'Nuova attività disponibile'
            );
          }
        )

        // VALUTAZIONI
        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'attivita_valutazioni',
          },

          () => {

            load(true);
          }
        )

        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );
    };

  }, []);

  // =========================
  // VOTE
  // =========================

  async function vote(
    attivitaId: string,
    voto: number
  ) {

    try {

      const deviceId =
        getDeviceId();

      const {
        data: existing,
      } = await supabase
        .from(
          'attivita_valutazioni'
        )
        .select('*')
        .eq(
          'attivita_id',
          attivitaId
        )
        .eq(
          'device_id',
          deviceId
        )
        .maybeSingle();

      if (existing) {

        await supabase
          .from(
            'attivita_valutazioni'
          )
          .update({
            voto,
          })
          .eq(
            'id',
            existing.id
          );

      } else {

        await supabase
          .from(
            'attivita_valutazioni'
          )
          .insert({

            attivita_id:
              attivitaId,

            voto,

            device_id:
              deviceId,
          });
      }

      toast.success(
        'Valutazione salvata'
      );

      load(true);

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore salvataggio voto'
      );
    }
  }

  // =========================
  // FILTER
  // =========================

  const filtered =
    [...stazioni]
      .filter((s) => {

        const q =
          search.toLowerCase();

        return (
          !q ||
          s.nome
            ?.toLowerCase()
            .includes(q) ||
          s.codice
            ?.toLowerCase()
            .includes(q)
        );
      });

  const favoriteStations =
    filtered.filter(
      (s) =>
        favorites.includes(s.id)
    );

  const normalStations =
    filtered.filter(
      (s) =>
        !favorites.includes(s.id)
    );

  // =========================
  // CARD
  // =========================

  function renderStationCard(
    stazione: any,
    isNearest = false
  ) {

    const expanded =
      expandedId ===
      stazione.id;

    const distance =
      userLocation &&
      stazione.lat &&
      stazione.lng
        ? calculateDistance(

            userLocation.lat,
            userLocation.lng,

            Number(
              stazione.lat
            ),

            Number(
              stazione.lng
            )
          )
        : null;

    return (

      <div
        key={stazione.id}
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
              expanded
                ? null
                : stazione.id
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
                  toggleFavorite(
                    stazione.id
                  );

                setFavorites(
                  updated
                );

                toast.success(
                  favorites.includes(
                    stazione.id
                  )
                    ? 'Rimosso dai preferiti'
                    : 'Aggiunto ai preferiti'
                );
              }}
              className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center"
            >

              <Star
                className={`w-5 h-5 ${
                  favorites.includes(
                    stazione.id
                  )
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
              stazione.attivita_stazione.length > 0 && (

                <div className="flex flex-col gap-3">

                  {stazione.attivita_stazione.map(
                    (attivita: any) => (

                      <AttivitaCard
                        key={attivita.id}
                        attivita={attivita}
                        onClick={() => {

                          console.log(
                            'ATTIVITA',
                            attivita
                          );

                        }}
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
              setSearch(
                e.target.value
              )
            }
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm"
          />

        </div>

        {/* LOADING */}
        {(loading ||
          !locationReady) && (

          <div className="flex flex-col gap-3">

            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />

          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          filtered.length === 0 && (

          <EmptyState
            title="Nessuna stazione trovata"
            description="Prova a modificare la ricerca"
          />
        )}

        {/* FAVORITES */}
        {!loading &&
          favoriteStations.length >
            0 && (

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
                  renderStationCard(
                    station
                  )
              )}

          </div>
        )}

        {/* STATIONS */}
        {!loading && (

          <div className="flex flex-col gap-3">

            {normalStations.map(
              (
                station,
                index
              ) =>
                renderStationCard(
                  station,
                  index === 0
                )
            )}

          </div>
        )}

      </div>

      {/* MODAL */}
      {addAttivitaStazioneId && (

        <AddAttivitaModal
          stazioneId={
            addAttivitaStazioneId
          }
          onClose={() =>
            setAddAttivitaStazioneId(
              null
            )
          }
          onSuccess={() => {

            setAddAttivitaStazioneId(
              null
            );

            load(true);
          }}
        />
      )}

    </>
  );
}