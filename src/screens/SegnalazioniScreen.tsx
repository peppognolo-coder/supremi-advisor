import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  X,
  PlusCircle,
  Building2,
  DoorOpen,
  Store,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import type {
  SalettaSegnalazione,
} from '../lib/database.types';

type SegnalazioneStazione = {
  id: string;

  tipo: string;

  stazione_nome: string | null;

  saletta_nome: string | null;

  attivita_nome: string | null;

  categoria: string | null;

  nota: string | null;

  stato: string;

  created_at: string;
};

export default function SegnalazioniScreen() {

  const [segnalazioniSalette, setSegnalazioniSalette] =
    useState<
      SalettaSegnalazione[]
    >([]);

  const [segnalazioniStazioni, setSegnalazioniStazioni] =
    useState<
      SegnalazioneStazione[]
    >([]);

  async function load() {

    const [
      { data: salette },

      { data: stazioni },

    ] = await Promise.all([

      supabase
        .from(
          'saletta_segnalazioni'
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          'segnalazioni_stazioni'
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),
    ]);

    setSegnalazioniSalette(
      salette ?? []
    );

    setSegnalazioniStazioni(
      (
        stazioni as
          SegnalazioneStazione[]
      ) ?? []
    );
  }

  useEffect(() => {
    load();
  }, []);

  // =========================
  // APPROVA CONTRIBUTI
  // =========================

  async function approveContributo(
    segnalazione: SegnalazioneStazione
  ) {

    // =========================
    // NUOVA STAZIONE
    // =========================

    if (
      segnalazione.tipo ===
      'stazione'
    ) {

      await supabase
        .from('stazioni')
        .insert({

          nome:
            segnalazione.stazione_nome,

          codice:
            'NEW',

          regione: '',

          provincia: '',

          attiva: true,

          note:
            segnalazione.nota ??
            '',
        });
    }

    // =========================
    // NUOVA SALETTA
    // =========================

    if (
      segnalazione.tipo ===
      'saletta'
    ) {

      const { data: stazione } =
        await supabase
          .from('stazioni')
          .select('id')
          .eq(
            'nome',
            segnalazione.stazione_nome
          )
          .single();

      if (stazione) {

        await supabase
          .from('salette')
          .insert({

            stazione_id:
              stazione.id,

            nome:
              segnalazione.saletta_nome,

            stato: 'aperta',

            accessibile: false,

            climatizzata: false,

            note:
              segnalazione.nota ??
              '',
          });
      }
    }

    // =========================
    // NUOVA ATTIVITÀ
    // =========================

    if (
      segnalazione.tipo ===
      'attivita'
    ) {

      const { data: stazione } =
        await supabase
          .from('stazioni')
          .select('id')
          .eq(
            'nome',
            segnalazione.stazione_nome
          )
          .single();

      if (stazione) {

        await supabase
          .from(
            'attivita_stazione'
          )
          .insert({

            stazione_id:
              stazione.id,

            nome:
              segnalazione.attivita_nome,

            categoria:
              segnalazione.categoria ??
              'altro',

            note:
              segnalazione.nota ??
              '',
          });
      }
    }

    // APPROVED
    await supabase
      .from(
        'segnalazioni_stazioni'
      )
      .update({
        stato: 'approved',
      })
      .eq(
        'id',
        segnalazione.id
      );

    load();
  }

  async function rejectContributo(
    id: string
  ) {

    await supabase
      .from(
        'segnalazioni_stazioni'
      )
      .update({
        stato: 'rejected',
      })
      .eq('id', id);

    load();
  }

  return (

    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Moderazione

        </h1>

        <p className="text-sm text-gray-400 mt-1">

          Gestione contributi collaborativi

        </p>

      </div>

      {/* CONTRIBUTI */}
      <div className="flex flex-col gap-3">

        {segnalazioniStazioni.map(
          (s) => {

            const isStazione =
              s.tipo ===
              'stazione';

            const isSaletta =
              s.tipo ===
              'saletta';

            const isAttivita =
              s.tipo ===
              'attivita';

            return (

              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
              >

                {/* TOP */}
                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-2xl bg-trenord-green/10 flex items-center justify-center flex-shrink-0">

                    {isStazione && (
                      <Building2 className="w-5 h-5 text-trenord-green" />
                    )}

                    {isSaletta && (
                      <DoorOpen className="w-5 h-5 text-trenord-green" />
                    )}

                    {isAttivita && (
                      <Store className="w-5 h-5 text-trenord-green" />
                    )}

                  </div>

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2 flex-wrap">

                      <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">

                        {s.tipo}

                      </span>

                      <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide font-bold">

                        {s.stato}

                      </span>

                    </div>

                    <h2 className="font-semibold text-gray-900 mt-1">

                      {s.stazione_nome}

                    </h2>

                    {s.saletta_nome && (

                      <p className="text-sm text-gray-500 mt-1">

                        {s.saletta_nome}

                      </p>
                    )}

                    {s.attivita_nome && (

                      <p className="text-sm text-gray-500 mt-1">

                        {s.attivita_nome}

                      </p>
                    )}

                    {s.categoria && (

                      <p className="text-xs text-trenord-green mt-2 font-semibold uppercase tracking-wide">

                        {s.categoria}

                      </p>
                    )}

                  </div>

                </div>

                {/* NOTE */}
                {s.nota && (

                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">

                    {s.nota}

                  </div>
                )}

                {/* BUTTONS */}
                {s.stato ===
                  'pending' && (

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        approveContributo(
                          s
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-semibold"
                    >

                      <Check className="w-4 h-4" />

                      Approva

                    </button>

                    <button
                      onClick={() =>
                        rejectContributo(
                          s.id
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold"
                    >

                      <X className="w-4 h-4" />

                      Rifiuta

                    </button>

                  </div>
                )}

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}