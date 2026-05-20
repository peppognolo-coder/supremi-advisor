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
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

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

  const [
    segnalazioni,
    setSegnalazioni,
  ] = useState<
    SegnalazioneStazione[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selected,
    setSelected,
  ] = useState<SegnalazioneStazione | null>(
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

      .from(
        'segnalazioni_stazioni'
      )

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
        'Errore caricamento segnalazioni'
      );

      setLoading(false);

      return;
    }

    setSegnalazioni(
      (
        data as
          SegnalazioneStazione[]
      ) ?? []
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
          'realtime-segnalazioni'
        )

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'segnalazioni_stazioni',
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
    segnalazione: SegnalazioneStazione
  ) {

    setSelected(
      segnalazione
    );

    setEditedData({
      ...segnalazione,
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

        .from(
          'segnalazioni_stazioni'
        )

        .update({

          stazione_nome:
            editedData.stazione_nome,

          saletta_nome:
            editedData.saletta_nome,

          attivita_nome:
            editedData.attivita_nome,

          categoria:
            editedData.categoria,

          nota:
            editedData.nota,
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
    segnalazione: SegnalazioneStazione
  ) {

    try {

      // =====================
      // STAZIONE
      // =====================

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

      // =====================
      // SALETTA
      // =====================

      if (
        segnalazione.tipo ===
        'saletta'
      ) {

        await supabase

          .from('salette')

          .insert({

            stazione:
              segnalazione.stazione_nome,

            nome:
              segnalazione.saletta_nome,

            tipo:
              segnalazione.saletta_nome,

            stato:
              'aperta',

            note:
              segnalazione.nota ??
              '',
          });
      }

      // =====================
      // ATTIVITA
      // =====================

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

      // =====================
      // UPDATE STATUS
      // =====================

      await supabase

        .from(
          'segnalazioni_stazioni'
        )

        .update({

          stato:
            'approved',
        })

        .eq(
          'id',
          segnalazione.id
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

    await supabase

      .from(
        'segnalazioni_stazioni'
      )

      .update({

        stato:
          'rejected',
      })

      .eq(
        'id',
        id
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

  function renderIcon(
    tipo: string
  ) {

    if (
      tipo ===
      'stazione'
    ) {

      return (
        <Building2 className="w-5 h-5 text-trenord-green" />
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

    return (
      <Store className="w-5 h-5 text-trenord-green" />
    );
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
        segnalazioni.length ===
          0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

          Nessuna segnalazione presente

        </div>
      )}

      {/* LIST */}
      <div className="flex flex-col gap-3">

        {segnalazioni.map(
          (s) => (

            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
            >

              {/* TOP */}
              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-2xl bg-trenord-green/10 flex items-center justify-center flex-shrink-0">

                  {renderIcon(
                    s.tipo
                  )}

                </div>

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-2 flex-wrap">

                    <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">

                      {s.tipo}

                    </span>

                    <span
                      className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wide font-bold ${
                        s.stato ===
                        'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.stato ===
                            'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >

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

              {/* DATE */}
              <div className="flex items-center gap-2 text-xs text-gray-400">

                <Clock3 className="w-4 h-4" />

                {new Date(
                  s.created_at
                ).toLocaleString(
                  'it-IT'
                )}

              </div>

              {/* ACTIONS */}
              {s.stato ===
                'pending' && (

                <div className="flex gap-2 flex-wrap">

                  {/* EDIT */}
                  <button
                    onClick={() =>
                      openEdit(s)
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
                        s
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

                  Modifica segnalazione

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

              <input
                value={
                  editedData.stazione_nome ??
                  ''
                }
                onChange={(e) =>
                  setEditedData({

                    ...editedData,

                    stazione_nome:
                      e.target.value,
                  })
                }
                placeholder="Stazione"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />

              {selected.tipo ===
                'saletta' && (

                <input
                  value={
                    editedData.saletta_nome ??
                    ''
                  }
                  onChange={(e) =>
                    setEditedData({

                      ...editedData,

                      saletta_nome:
                        e.target.value,
                    })
                  }
                  placeholder="Nome saletta"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              )}

              {selected.tipo ===
                'attivita' && (

                <>
                  <input
                    value={
                      editedData.attivita_nome ??
                      ''
                    }
                    onChange={(e) =>
                      setEditedData({

                        ...editedData,

                        attivita_nome:
                          e.target.value,
                      })
                    }
                    placeholder="Nome attività"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />

                  <input
                    value={
                      editedData.categoria ??
                      ''
                    }
                    onChange={(e) =>
                      setEditedData({

                        ...editedData,

                        categoria:
                          e.target.value,
                      })
                    }
                    placeholder="Categoria"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </>
              )}

              <textarea
                value={
                  editedData.nota ??
                  ''
                }
                onChange={(e) =>
                  setEditedData({

                    ...editedData,

                    nota:
                      e.target.value,
                  })
                }
                placeholder="Note"
                rows={5}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
              />

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

                    ...editedData,
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