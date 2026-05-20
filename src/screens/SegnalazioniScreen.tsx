import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  X,
  Building2,
  DoorOpen,
  Store,
  Pencil,
  Save,
  Clock3,
  Train,
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

export default function SegnalazioniScreen() {

  const [
    contributi,
    setContributi,
  ] = useState<
    Contributo[]
  >([]);

  const [loading, setLoading] =
    useState(true);

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

    const {
      data,
      error,
    } = await supabase

      .from('contributi')

      .select('*')

      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (error) {

      console.error(error);

      toast.error(
        'Errore caricamento contributi'
      );

      setLoading(false);

      return;
    }

    setContributi(
      (data as Contributo[]) ??
        []
    );

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
            table:
              'contributi',
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
  // OPEN EDIT
  // =========================

  function openEdit(
    contributo: Contributo
  ) {

    setSelected(
      contributo
    );

    setEditedData({
      ...(contributo.dati ||
        {}),
    });
  }

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

      console.error(error);

      toast.error(
        'Errore salvataggio'
      );

      return;
    }

    toast.success(
      'Modifiche salvate'
    );

    setSelected(null);

    load();
  }

  // =========================
  // APPROVE
  // =========================

  async function approveContributo(
    contributo: Contributo
  ) {

    try {

      const dati =
        contributo.dati;

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

            indirizzo:
              dati.indirizzo,

            maps_query:
              dati.maps_query,

            lat:
              dati.lat || null,

            lng:
              dati.lng || null,

            plus_code:
              dati.plus_code,

            note:
              dati.note,

            attiva: true,
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
              dati.servizi
                ?.microonde ??
              false,

            distributori:
              dati.servizi
                ?.distributori ??
              false,

            acqua:
              dati.servizi
                ?.acqua ??
              false,

            climatizzata:
              dati.servizi
                ?.climatizzata ??
              false,
          });
      }

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

            indirizzo:
              dati.indirizzo,

            convenzione:
              dati.convenzione,

            sconto:
              dati.sconto,

            telefono:
              dati.telefono,

            sito:
              dati.sito,

            apertura:
              dati.apertura,

            chiusura:
              dati.chiusura,

            giorni:
              dati.giorni,

            note:
              dati.note,
          });
      }

      // =====================
      // UPDATE STATUS
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

  async function rejectContributo(
    id: string
  ) {

    const { error } =
      await supabase

        .from('contributi')

        .update({

          stato:
            'rejected',
        })

        .eq(
          'id',
          id
        );

    if (error) {

      toast.error(
        'Errore rifiuto contributo'
      );

      return;
    }

    toast.success(
      'Contributo rifiutato'
    );

    setSelected(null);

    load();
  }

  // =========================
  // ICON
  // =========================

  function renderIcon(
    tipo: string
  ) {

    if (
      tipo ===
      'stazione'
    ) {

      return (
        <Train className="w-5 h-5 text-trenord-green" />
      );
    }

    if (
      tipo ===
      'saletta'
    ) {

      return (
        <DoorOpen className="w-5 h-5 text-trenord-green" />
      );
    }

    if (
      tipo ===
      'attivita'
    ) {

      return (
        <Store className="w-5 h-5 text-trenord-green" />
      );
    }

    return (
      <Building2 className="w-5 h-5 text-trenord-green" />
    );
  }

  // =========================
  // RENDER LABEL
  // =========================

  function getTitle(
    contributo: Contributo
  ) {

    const dati =
      contributo.dati;

    if (
      contributo.tipo ===
      'stazione'
    ) {

      return (
        dati.nome ||
        'Nuova stazione'
      );
    }

    if (
      contributo.tipo ===
      'saletta'
    ) {

      return (
        dati.stazione ||
        'Saletta'
      );
    }

    if (
      contributo.tipo ===
      'attivita'
    ) {

      return (
        dati.nome ||
        'Attività'
      );
    }

    return 'Contributo';
  }

  return (

    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Segnalazioni

        </h1>

        <p className="text-sm text-gray-400 mt-1">

          Gestione contributi collaborativi

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
        contributi.length ===
          0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

          Nessuna segnalazione presente

        </div>
      )}

      {/* LIST */}
      <div className="flex flex-col gap-3">

        {contributi.map(
          (c) => (

            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
            >

              {/* TOP */}
              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-2xl bg-trenord-green/10 flex items-center justify-center flex-shrink-0">

                  {renderIcon(
                    c.tipo
                  )}

                </div>

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-2 flex-wrap">

                    <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">

                      {c.tipo}

                    </span>

                    <span
                      className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wide font-bold ${
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

                    </span>

                  </div>

                  <h2 className="font-semibold text-gray-900 mt-1">

                    {getTitle(
                      c
                    )}

                  </h2>

                </div>

              </div>

              {/* JSON PREVIEW */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 overflow-x-auto">

                <pre>

                  {JSON.stringify(
                    c.dati,
                    null,
                    2
                  )}

                </pre>

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

                <div className="flex gap-2 flex-wrap">

                  {/* EDIT */}
                  <button
                    onClick={() =>
                      openEdit(c)
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-semibold"
                  >

                    <Pencil className="w-4 h-4" />

                    Modifica

                  </button>

                  {/* APPROVE */}
                  <button
                    onClick={() =>
                      approveContributo(
                        {
                          ...c,

                          dati:
                            editedData,
                        }
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-semibold"
                  >

                    <Check className="w-4 h-4" />

                    Approva

                  </button>

                  {/* REJECT */}
                  <button
                    onClick={() =>
                      rejectContributo(
                        c.id
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
          )
        )}

      </div>

      {/* MODAL EDIT */}
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
                  setSelected(
                    null
                  )
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

                    <textarea
                      value={
                        typeof value ===
                        'object'
                          ? JSON.stringify(
                              value,
                              null,
                              2
                            )
                          : String(
                              value ??
                                ''
                            )
                      }
                      onChange={(e) =>
                        setEditedData({

                          ...editedData,

                          [key]:
                            e.target.value,
                        })
                      }
                      rows={4}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
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

                Salva

              </button>

              <button
                onClick={() =>
                  approveContributo({

                    ...selected,

                    dati:
                      editedData,
                  })
                }
                className="flex-1 bg-emerald-600 text-white rounded-2xl py-3 font-semibold"
              >

                Approva

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}