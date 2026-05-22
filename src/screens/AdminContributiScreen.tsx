import { useEffect, useState } from 'react';

import {
  Check,
  X,
  Clock3,
  FileJson,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

interface Contributo {

  id: string;

  tipo: string;

  dati: any;

  stato: string;

  created_at: string;
}

export default function AdminContributiScreen() {

  const [loading, setLoading] =
    useState(true);

  const [contributi, setContributi] =
    useState<Contributo[]>([]);

  // =========================
  // NORMALIZE
  // =========================

  function normalizeGroupId(
    text: string
  ) {

    return text
      ?.toLowerCase()
      ?.trim()
      ?.replaceAll(' ', '_');
  }

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    const { data, error } =
      await supabase
        .from('contributi')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

    if (!error) {

      setContributi(
        data ?? []
      );
    }

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // UPDATE STATUS
  // =========================

  async function updateStatus(
    contributo: Contributo,
    stato: string
  ) {

    // =========================
    // APPROVAZIONE
    // =========================

    if (stato === 'approved') {

      // =========================
      // SALETTA
      // =========================

      if (
        contributo.tipo ===
        'saletta'
      ) {

        const dati =
          contributo.dati;

        const groupId =
          normalizeGroupId(
            dati.stazione
          );

        // CERCA SALETTA
        const {
          data: existing,
        } = await supabase
          .from('salette')
          .select('*')
          .eq(
            'saletta_group_id',
            groupId
          )
          .eq(
            'tipo',
            dati.tipo
          )
          .maybeSingle();

        // =========================
        // UPDATE
        // =========================

        if (existing) {

          await supabase
            .from('salette')
            .update({

              codice_accesso:
                dati.codice_accesso,

              ubicazione:
                dati.ubicazione,

              stato:
                dati.stato,

              note:
                dati.note,

              microonde:
                dati.microonde,

              distributori:
                dati.distributori,

              acqua:
                dati.acqua,

              climatizzata:
                dati.climatizzata,
            })
            .eq(
              'id',
              existing.id
            );

        } else {

          // =========================
          // INSERT
          // =========================

          await supabase
            .from('salette')
            .insert({

              saletta_group_id:
                groupId,

              stazione:
                dati.stazione,

              nome:
                dati.stazione,

              tipo:
                dati.tipo,

              codice_accesso:
                dati.codice_accesso,

              ubicazione:
                dati.ubicazione,

              stato:
                dati.stato,

              note:
                dati.note,

              microonde:
                dati.microonde,

              distributori:
                dati.distributori,

              acqua:
                dati.acqua,

              climatizzata:
                dati.climatizzata,
            });
        }
      }

      // =========================
      // ATTIVITA
      // =========================

     if (
  contributo.tipo ===
  'attivita'
) {

  const dati =
    contributo.dati;

  await supabase
    .from('attivita_stazione')
    .insert({

      stazione_id:
        dati.stazione_id,

      nome:
        dati.nome,

      categoria:
        dati.categoria,

      indirizzo:
        dati.indirizzo,

     distanza_piedi:
  dati.distanza_piedi,

      ubicazione:
        dati.ubicazione,

      note:
        dati.note,

      convenzionato:
        dati.convenzionato,

      giorni_apertura:
        dati.giorni_apertura,

      orario_apertura:
        dati.apertura,

      orario_chiusura:
        dati.chiusura,
    });
}

        const dati =
          contributo.dati;

        const groupId =
          normalizeGroupId(
            dati.nome
          );

        // CERCA ATTIVITA
        const {
          data: existing,
        } = await supabase
          .from('attivita')
          .select('*')
          .eq(
            'activity_group_id',
            groupId
          )
          .maybeSingle();

        // =========================
        // UPDATE
        // =========================

        if (existing) {

          await supabase
            .from('attivita')
            .update({

              categoria:
                dati.categoria,

              indirizzo:
                dati.indirizzo,

              convenzione:
                dati.convenzione,

              sconto:
                dati.sconto,

              telefono:
                dati.telefono,

              sito_web:
                dati.sito_web,

              giorni_apertura:
                dati.giorni_apertura,

              apertura:
                dati.apertura,

              chiusura:
                dati.chiusura,

              note:
                dati.note,
            })
            .eq(
              'id',
              existing.id
            );

        } else {

          // =========================
          // INSERT
          // =========================

          await supabase
            .from('attivita')
            .insert({

              activity_group_id:
                groupId,

              nome:
                dati.nome,

              categoria:
                dati.categoria,

              indirizzo:
                dati.indirizzo,

              convenzione:
                dati.convenzione,

              sconto:
                dati.sconto,

              telefono:
                dati.telefono,

              sito_web:
                dati.sito_web,

              giorni_apertura:
                dati.giorni_apertura,

              apertura:
                dati.apertura,

              chiusura:
                dati.chiusura,

              note:
                dati.note,
            });
        }
      }

    // =========================
    // UPDATE STATUS
    // =========================

    await supabase
      .from('contributi')
      .update({
        stato,
      })
      .eq(
        'id',
        contributo.id
      );

    load();
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="flex flex-col gap-4">

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Moderazione Contributi

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Gestisci contributi inviati dagli utenti

        </p>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="text-sm text-gray-500">

          Caricamento...

        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        contributi.length === 0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

          Nessun contributo presente

        </div>
      )}

      {/* LIST */}
      <div className="flex flex-col gap-4">

        {contributi.map(
          (c) => (

            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
            >

              {/* TOP */}
              <div className="flex items-start justify-between gap-3">

                <div>

                  <div className="flex items-center gap-2">

                    <FileJson className="w-5 h-5 text-trenord-green" />

                    <h2 className="font-bold text-gray-900 capitalize">

                      {c.tipo}

                    </h2>

                  </div>

                  <p className="text-xs text-gray-400 mt-1">

                    ID:
                    {' '}
                    {c.id}

                  </p>

                </div>

                {/* STATUS */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    c.stato ===
                    'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.stato ===
                        'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >

                  {c.stato}

                </div>

              </div>

         {/* DATI CONTRIBUTO */}
<div
  className="
    bg-gray-50
    rounded-xl
    border
    border-gray-100
    p-4
    flex
    flex-col
    gap-3
  "
>

  {Object.entries(
    c.dati || {}
  ).map(
    ([key, value]) => (

      <div
        key={key}
        className="
          flex
          justify-between
          gap-4
          text-sm
        "
      >

        <span
          className="
            font-medium
            text-gray-500
          "
        >
          {key}
        </span>

        <span
          className="
            text-gray-900
            text-right
            break-all
          "
        >
          {String(value)}
        </span>

      </div>

    )
  )}

</div>

              {/* DATE */}
              <div className="flex items-center gap-2 text-xs text-gray-400">

                <Clock3 className="w-4 h-4" />

                {new Date(
                  c.created_at
                ).toLocaleString(
                  'it-IT'
                )}

              </div>

              {/* ACTIONS */}
              {c.stato ===
                'pending' && (

                <div className="flex gap-2">

                  {/* APPROVE */}
                  <button
                    onClick={() =>
                      updateStatus(
                        c,
                        'approved'
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90"
                  >

                    <Check className="w-4 h-4" />

                    Approva

                  </button>

                  {/* REJECT */}
                  <button
                    onClick={() =>
                      updateStatus(
                        c,
                        'rejected'
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90"
                  >

                    <X className="w-4 h-4" />

                    Rifiuta

                  </button>

                </div>
              )}

            </div>
          )
        )}

      </div>

    </div>
  );
}