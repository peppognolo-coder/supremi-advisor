import { useEffect, useState } from 'react';

import {
  Check,
  X,
  Clock3,
  Store,
  Building2,
  MapPin,
  Eye,
  Save,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

interface Contributo {

  id: string;

  tipo: string;

  dati: any;

  stato: string;

  created_at: string;
}

export default function AdminSegnalazioni() {

  const [loading, setLoading] =
    useState(true);

  const [contributi, setContributi] =
    useState<Contributo[]>([]);

  const [
    selected,
    setSelected,
  ] = useState<Contributo | null>(
    null
  );

  const [
    editedData,
    setEditedData,
  ] = useState<any>({});

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

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

    load();

    const channel =
      supabase

        .channel(
          'realtime-contributi'
        )

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table: 'contributi',
          },

          () => {

            load();
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
  // SAVE EDITS
  // =========================

  async function saveEdits() {

    if (!selected)
      return;

    const { error } =
      await supabase

        .from('contributi')

        .update({

          dati:
            editedData,
        })

        .eq(
          'id',
          selected.id
        );

    if (error) {

      toast.error(
        'Errore salvataggio'
      );

      return;
    }

    toast.success(
      'Modifiche salvate'
    );

    setSelected({

      ...selected,

      dati:
        editedData,
    });

    load();
  }

  // =========================
  // APPROVE
  // =========================

  async function approveContribution(
    contributo: Contributo
  ) {

    try {

      const dati =
        contributo.dati;

      // =====================
      // ATTIVITA
      // =====================

      if (
        contributo.tipo ===
        'attivita'
      ) {

        await supabase

          .from(
            'attivita_stazione'
          )

          .insert({

            stazione_id:
              dati.stazione_id,

            nome:
              dati.nome,

            categoria:
              dati.categoria,

            ubicazione:
              dati.ubicazione,

            maps_query:
              dati.maps_query,

            convenzionato:
              dati.convenzionato,

            note:
              dati.note,

            indirizzo:
              dati.indirizzo,

            giorni_apertura:
              dati.giorni_apertura,

            orario_apertura:
              dati.orario_apertura,

            orario_chiusura:
              dati.orario_chiusura,
          });
      }

      // =====================
      // SALETTA
      // =====================

      if (
        contributo.tipo ===
        'saletta'
      ) {

        await supabase

          .from('salette')

          .insert({

            stazione:
              dati.stazione,

            nome:
              dati.tipo,

            tipo:
              dati.tipo,

            codice_accesso:
              dati.codice_accesso,

            ubicazione:
              dati.ubicazione,

            microonde:
              dati.microonde,

            distributori:
              dati.distributori,

            acqua:
              dati.acqua,

            climatizzata:
              dati.climatizzata,

            stato:
              dati.stato,

            note:
              dati.note,
          });
      }

      // =====================
      // STAZIONE
      // =====================

      if (
        contributo.tipo ===
        'stazione'
      ) {

        await supabase

          .from('stazioni')

          .insert({

            nome:
              dati.nome,

            codice:
              dati.codice,

            regione:
              dati.regione,

            provincia:
              dati.provincia,

            lat:
              dati.lat,

            lng:
              dati.lng,

            note:
              dati.note,

            indirizzo:
              dati.indirizzo,

            maps_query:
              dati.maps_query,

            plus_code:
              dati.plus_code,

            attiva: true,
          });
      }

      // =====================
      // STATUS
      // =====================

      await supabase

        .from('contributi')

        .update({

          stato:
            'approved',
        })

        .eq(
          'id',
          contributo.id
        );

      toast.success(
        'Contributo approvato'
      );

      setSelected(null);

      load();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore approvazione'
      );
    }
  }

  // =========================
  // REJECT
  // =========================

  async function rejectContribution(
    contributo: Contributo
  ) {

    await supabase

      .from('contributi')

      .update({

        stato:
          'rejected',
      })

      .eq(
        'id',
        contributo.id
      );

    toast.success(
      'Contributo rifiutato'
    );

    setSelected(null);

    load();
  }

  // =========================
  // ICON
  // =========================

  function getTipoIcon(
    tipo: string
  ) {

    switch (tipo) {

      case 'attivita':
        return (
          <Store className="w-5 h-5" />
        );

      case 'saletta':
        return (
          <Building2 className="w-5 h-5" />
        );

      case 'stazione':
        return (
          <MapPin className="w-5 h-5" />
        );

      default:
        return (
          <Eye className="w-5 h-5" />
        );
    }
  }

  return (

    <div className="flex flex-col gap-4">

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Segnalazioni

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Gestisci contributi e approvazioni dipendenti

        </p>

      </div>

      {/* LIST */}
      <div className="flex flex-col gap-3">

        {contributi.map(
          (c) => (

            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
            >

              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-2xl bg-trenord-green/10 text-trenord-green flex items-center justify-center">

                    {getTipoIcon(
                      c.tipo
                    )}

                  </div>

                  <div>

                    <h2 className="font-bold text-gray-900">

                      {c.dati?.nome ||
                        c.dati?.stazione ||
                        'Contributo'}

                    </h2>

                    <p className="text-sm text-gray-500">

                      {c.tipo}

                    </p>

                  </div>

                </div>

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
              <div className="flex gap-2 flex-wrap">

                <button
                  onClick={() => {

                    setSelected(c);

                    setEditedData(
                      c.dati || {}
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
                >

                  Apri

                </button>

                {c.stato ===
                  'pending' && (

                  <>
                    <button
                      onClick={() =>
                        approveContribution(
                          c
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium"
                    >

                      Approva

                    </button>

                    <button
                      onClick={() =>
                        rejectContribution(
                          c
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium"
                    >

                      Rifiuta

                    </button>
                  </>
                )}

              </div>

            </div>
          )
        )}

      </div>

      {/* MODAL */}
      {selected && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

          <div className="bg-white rounded-3xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-4">

            {/* HEADER */}
            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-gray-900">

                  Modifica contributo

                </h2>

                <p className="text-sm text-gray-500">

                  {selected.tipo}

                </p>

              </div>

              <button
                onClick={() =>
                  setSelected(null)
                }
                className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
              >

                <X className="w-5 h-5 text-gray-500" />

              </button>

            </div>

            {/* FORM */}
            <div className="flex flex-col gap-3">

              {Object.entries(
                editedData || {}
              ).map(
                ([key, value]) => (

                  <div
                    key={key}
                    className="flex flex-col gap-1"
                  >

                    <label className="text-xs font-semibold uppercase text-gray-400">

                      {key}

                    </label>

                    <input
                      value={
                        value as string
                      }
                      onChange={(e) =>
                        setEditedData({

                          ...editedData,

                          [key]:
                            e.target.value,
                        })
                      }
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />

                  </div>
                )
              )}

            </div>

            {/* ACTIONS */}
            <div className="flex gap-3">

              <button
                onClick={
                  saveEdits
                }
                className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
              >

                <Save className="w-4 h-4" />

                Salva modifiche

              </button>

              {selected.stato ===
                'pending' && (

                <>
                  <button
                    onClick={() =>
                      approveContribution({

                        ...selected,

                        dati:
                          editedData,
                      })
                    }
                    className="flex-1 bg-emerald-600 text-white rounded-2xl py-3 font-semibold"
                  >

                    Approva

                  </button>

                  <button
                    onClick={() =>
                      rejectContribution(
                        selected
                      )
                    }
                    className="flex-1 bg-red-600 text-white rounded-2xl py-3 font-semibold"
                  >

                    Rifiuta

                  </button>
                </>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}