import { useState, useEffect } from 'react';

import {
  Search,
  DoorOpen,
  MapPin,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import {
  getCurrentLocation,
  calculateDistance,
} from '../lib/location';

import type {
  Saletta,
} from '../lib/database.types';

import SalettaCard from '../components/SalettaCard';

import LoadingSpinner from '../components/LoadingSpinner';

import EmptyState from '../components/EmptyState';

interface GroupedSaletta {

  stazione: string;

  salette: Saletta[];

  distanza?: number;
}

interface StazioneCoordinates {

  nome: string;

  lat: number;

  lng: number;
}

interface Props {
  refreshKey?: number;
}

export default function SaletteScreen({
  refreshKey = 0,
}: Props) {

  const [salette, setSalette] =
    useState<GroupedSaletta[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [userLocation, setUserLocation] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  // =========================
  // GEOLOCATION
  // =========================

  useEffect(() => {

    getCurrentLocation()

      .then((location) => {

        setUserLocation(
          location
        );
      })

      .catch(() => {

        console.log(
          'Geolocalizzazione non disponibile'
        );
      });

  }, []);

  // =========================
  // LOAD
  // =========================

  useEffect(() => {

    async function load() {

      setLoading(true);

      // =====================
      // SALETTE
      // =====================

      const {
        data,
        error,
      } = await supabase
        .from('salette')
        .select('*');

      // =====================
      // STAZIONI
      // =====================

      const {
        data: stazioniData,
      } = await supabase
        .from('stazioni')
        .select(
          'nome, lat, lng'
        );

      if (error) {

        console.error(error);

        toast.error(
          'Errore caricamento salette'
        );

        setLoading(false);

        return;
      }

      // =====================
      // MAP STAZIONI
      // =====================

      const stazioniCoordinates:
        StazioneCoordinates[] =
        (
          stazioniData ?? []
        ).filter(
          (s) =>
            s.lat &&
            s.lng
        );

      // =====================
      // GROUP
      // =====================

      const groupedMap =
        new Map<
          string,
          GroupedSaletta
        >();

      (data ?? []).forEach(
        (saletta) => {

          const normalizedKey =
            saletta.stazione
              ?.trim()
              .toLowerCase();

          // CREATE GROUP
          if (
            !groupedMap.has(
              normalizedKey
            )
          ) {

            groupedMap.set(
              normalizedKey,
              {

                stazione:
                  saletta.stazione,

                salette: [],
              }
            );
          }

          // PUSH
          groupedMap
            .get(normalizedKey)
            ?.salette.push(
              saletta
            );
        }
      );

      // =====================
      // ARRAY
      // =====================

      let grouped =
        Array.from(
          groupedMap.values()
        );

      // =====================
      // DISTANCE SORT
      // =====================

      if (userLocation) {

        grouped = grouped.map(
          (group) => {

            const first =
              group.salette[0];

            let distanza:
              | number
              | undefined =
              undefined;

            // =================
            // COORDINATE
            // =================

            let lat =
              first?.lat;

            let lng =
              first?.lng;

            // =================
            // FALLBACK STAZIONE
            // =================

            if (
              (!lat ||
                !lng) &&
              first?.stazione
            ) {

              const stazioneMatch =
                stazioniCoordinates.find(
                  (s) =>
                    s.nome
                      ?.trim()
                      .toLowerCase() ===
                    first.stazione
                      ?.trim()
                      .toLowerCase()
                );

              if (
                stazioneMatch
              ) {

                lat =
                  stazioneMatch.lat;

                lng =
                  stazioneMatch.lng;
              }
            }

            // =================
            // DISTANCE
            // =================

            if (
              lat &&
              lng
            ) {

              distanza =
                calculateDistance(

                  userLocation.lat,
                  userLocation.lng,

                  Number(lat),

                  Number(lng)
                );
            }

            return {
              ...group,
              distanza,
            };
          }
        );

        // ===================
        // SORT
        // ===================

        grouped.sort(
          (a, b) => {

            // nearest first
            if (
              a.distanza !=
                null &&
              b.distanza !=
                null
            ) {

              return (
                a.distanza -
                b.distanza
              );
            }

            // no coords
            if (
              a.distanza ==
                null &&
              b.distanza !=
                null
            ) {

              return 1;
            }

            if (
              a.distanza !=
                null &&
              b.distanza ==
                null
            ) {

              return -1;
            }

            // fallback alpha
            return a.stazione.localeCompare(
              b.stazione,
              'it'
            );
          }
        );

      } else {

        grouped.sort(
          (a, b) =>
            a.stazione.localeCompare(
              b.stazione,
              'it'
            )
        );
      }

      setSalette(grouped);

      setLoading(false);
    }

    load();

  }, [
    userLocation,
    refreshKey,
  ]);

  // =========================
  // SEARCH
  // =========================

  const filtered =
    salette.filter(
      (group) => {

        const q =
          search
            .trim()
            .toLowerCase();

        return (
          !q ||

          group.stazione
            .toLowerCase()
            .includes(q) ||

          group.salette.some(
            (s) =>
              s.tipo
                ?.toLowerCase()
                .includes(q)
          )
        );
      }
    );

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return <LoadingSpinner />;
  }

  // =========================
  // EMPTY
  // =========================

  if (filtered.length === 0) {

    return (
      <EmptyState
        icon={DoorOpen}
        title="Nessuna saletta trovata"
        description="Prova a modificare la ricerca."
      />
    );
  }

  // =========================
  // RENDER
  // =========================

  return (

    <div className="flex flex-col gap-4">

      {/* SEARCH */}
      <div className="sticky top-[110px] z-20 bg-gray-100 pb-1">

        <div className="relative">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Cerca stazione o tipo..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm"
          />

        </div>

      </div>

      {/* LISTA */}
      <div className="flex flex-col gap-3">

        {filtered.map(
          (
            group,
            index
          ) => (

            <div
              key={
                group.stazione
              }
              className={`rounded-3xl transition-all ${
                index === 0
                  ? 'ring-2 ring-trenord-green/20'
                  : ''
              }`}
            >

              {/* NEAREST */}
              {index === 0 &&
                group.distanza !=
                  null && (

                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-xs font-semibold">

                  <MapPin className="w-3 h-3" />

                  Saletta più vicina

                  <span>

                    •{' '}
                    {group.distanza.toFixed(
                      1
                    )}{' '}
                    km

                  </span>

                </div>
              )}

              <SalettaCard
                stazioneName={
                  group.stazione
                }
                salette={
                  group.salette
                }
              />

            </div>
          )
        )}

      </div>

    </div>
  );
}