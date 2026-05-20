import { useState, useEffect } from 'react';

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

    // =====================
    // STAZIONE
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

    console.log(
      'ATTIVITA TROVATE',
      attivitaData
    );

    // =====================
    // MERGE
    // =====================

    setLiveStazione({

      ...stationData,

      salette:
        Array.isArray(
          stationData?.salette
        )
          ? stationData.salette
          : [],

      attivita_stazione:
        Array.isArray(
          attivitaData
        )
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
            table:
              'attivita_stazione',
          },

          () => {

            reloadStation();
          }
        )

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'salette',
          },

          () => {

            reloadStation();
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
    Array.isArray(
      liveStazione?.salette
    )
      ? liveStazione.salette
      : [];

  const locali =
    Array.isArray(
      liveStazione?.attivita_stazione
    )
      ? liveStazione
          .attivita_stazione
      : [];

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
  // FORM
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

    <div>
      {/* FILE IDENTICO AL TUO */}
      {/* NON CAMBIA ALTRO */}
    </div>
  );
}