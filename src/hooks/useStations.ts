import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';

import {
  getFavorites,
  toggleFavorite,
} from '../lib/favorites';

import {
  getCurrentLocation,
  calculateDistance,
} from '../lib/location';

import type { Stazione } from '../lib/database.types';

export interface StationWithDistance
  extends Stazione {

  distance?: number;
}

export function useStations() {

  const [stations, setStations] =
    useState<StationWithDistance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [
    locationAvailable,
    setLocationAvailable,
  ] = useState(false);

  const [
    userLocation,
    setUserLocation,
  ] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // =====================
  // FAVORITI
  // =====================

  useEffect(() => {

    setFavorites(
      getFavorites()
    );

  }, []);

  // =====================
  // GEOLOCALIZZAZIONE
  // =====================

  useEffect(() => {

    async function loadLocation() {

      try {

        const location =
          await getCurrentLocation();

        setUserLocation(
          location
        );

        setLocationAvailable(
          true
        );

      } catch {

        setLocationAvailable(
          false
        );
      }
    }

    loadLocation();

  }, []);

  // =====================
  // STAZIONI
  // =====================

  useEffect(() => {

    async function loadStations() {

      try {

        setLoading(true);

        const {
          data,
          error,
        } = await supabase

          .from('stazioni')

          .select('*')

          .eq(
            'attiva',
            true
          );

        if (error) {

          throw error;
        }

        const withDistance =
          (data ?? []).map(
            (station) => {

              let distance:
                number | undefined;

              if (
                userLocation &&
                station.lat !== null &&
                station.lng !== null
              ) {

                distance =
                  calculateDistance(

                    userLocation.lat,
                    userLocation.lng,

                    station.lat,
                    station.lng
                  );
              }

              return {

                ...station,

                distance,
              };
            }
          );

        setStations(
          withDistance
        );

      } catch (error) {

        console.error(
          'Errore caricamento stazioni',
          error
        );

      } finally {

        setLoading(false);
      }
    }

    loadStations();

  }, [userLocation]);

  // =====================
  // STAZIONE PIÙ VICINA
  // =====================

  const nearestStation =
    useMemo(() => {

      if (
        !locationAvailable
      ) {

        return null;
      }

      const validStations =
        stations.filter(
          (
            station
          ) =>
            typeof station.distance ===
            'number'
        );

      if (
        validStations.length === 0
      ) {

        return null;
      }

      return validStations.reduce(
        (
          nearest,
          current
        ) => {

          if (
            (current.distance ?? 0) <
            (nearest.distance ?? 0)
          ) {

            return current;
          }

          return nearest;
        }
      );

    }, [
      stations,
      locationAvailable,
    ]);

  // =====================
  // FILTRO + ORDINAMENTO
  // =====================

  const filteredStations =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      let result =
        stations.filter(
          (station) => {

            if (!query)
              return true;

            return (

              station.nome
                .toLowerCase()
                .includes(query) ||

              station.codice
                .toLowerCase()
                .includes(query)
            );
          }
        );

      result.sort(
        (a, b) => {

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
          ) {

            return -1;
          }

          if (
            !aFav &&
            bFav
          ) {

            return 1;
          }

          return a.nome.localeCompare(
            b.nome,
            'it'
          );
        }
      );

      return result;

    }, [
      stations,
      favorites,
      search,
    ]);

  // =====================
  // PREFERITI
  // =====================

  function toggleStationFavorite(
    stationId: string
  ) {

    const updated =
      toggleFavorite(
        stationId
      );

    setFavorites(
      updated
    );
  }

  return {

    stations:
      filteredStations,

    loading,

    nearestStation,

    search,
    setSearch,

    favorites,

    toggleStationFavorite,

    locationAvailable,
  };
}