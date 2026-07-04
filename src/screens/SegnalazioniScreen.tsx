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

    setEditedData({});

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

        const {
          error:
            stazioneInsertError,
        } = await supabase

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

            maps_query:
              dati.maps_query,

            lat:
              dati.lat || null,

            lng:
              dati.lng || null,

            note:
              dati.note,

            attiva: true,
          });

        if (
          stazioneInsertError
        ) {

          console.error(
            stazioneInsertError
          );

          toast.error(
            'Errore inserimento stazione'
          );

          return;
        }
      }

      // =====================
      // SALETTA
      // =====================

      if (
        contributo.tipo ===
        'saletta'
      ) {

        const {
          data: stazioneData,
          error: stazioneError,
        } = await supabase

          .from('stazioni')

          .select('id')

          .eq(
            'nome',
            dati.stazione
          )

          .single();

        if (
          stazioneError ||
          !stazioneData
        ) {

          console.error(
            stazioneError
          );

          toast.error(
            'Stazione non trovata'
          );

          return;
        }

        const {
          error:
            salettaError,
        } = await supabase

          .from('salette')

          .insert({

            stazione_id:
              stazioneData.id,

            nome:
              dati.tipo ||

              'Saletta',

            stato:
              dati.stato ===
              'Aperta'
                ? 'aperta'
                : dati.stato ===
                  'Chiusa'
                ? 'chiusa'
                : 'manutenzione',

            accessibile: true,

            climatizzata:
              dati.servizi
                ?.climatizzata ??
              false,

            codice_accesso:
              dati.codice_accesso,

            ubicazione:
              dati.ubicazione,

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

            fontana_acqua:
              dati.servizi
                ?.acqua ??
              false,
          });

        if (salettaError) {

          console.error(
            salettaError
          );

          toast.error(
            'Errore inserimento saletta'
          );

          return;
        }
      }

      // =====================
      // ATTIVITA
      // =====================

      if (
        contributo.tipo ===
        'attivita'
      ) {

        const {
          error:
            attivitaError,
        } = await supabase

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
              dati.indirizzo ||
              null,

            maps_query:
              dati.maps_query ||

              dati.nome,

            ubicazione:
              dati.ubicazione ||
              null,

            convenzionato:
              dati.convenzionato ??
              false,

            note:
              dati.note ||
              null,

            fasce_orarie:
              dati.fasce_orarie ??
              [],
          });

        if (attivitaError) {

          console.error(
            attivitaError
          );

          toast.error(
            'Errore inserimento attività'
          );

          return;
        }
      }

      // =====================
      // UPDATE STATUS
      // =====================

      const {
        error:
          updateError,
      } = await supabase

        .from('contributi')

        .update({

          stato:
            'approved',
        })

        .eq(
          'id',
          contributo.id
        );

      if (updateError) {

        console.error(
          updateError
        );

        toast.error(
          'Errore aggiornamento stato contributo'
        );

        return;
      }

      toast.success(
        'Contributo approvato'
      );

      setSelected(null);

      setEditedData({});

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

    setEditedData({});

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
  // TITLE
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
    <div className="h-full min-h-0 overflow-y-auto">
    <div className="flex flex-col gap-4">

      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Segnalazioni

        </h1>

        <p className="text-sm text-gray-400 mt-1">

          Gestione contributi collaborativi

        </p>

      </div>

      {loading && (

        <div className="text-sm text-gray-500">

          Caricamento...

        </div>
      )}

      {!loading &&
        contributi.length ===
          0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

          Nessuna segnalazione presente

        </div>
      )}

      <div className="flex flex-col gap-3">

        {contributi.map(
          (c) => (

            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
            >

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

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 overflow-x-auto">

                <pre>

                  {JSON.stringify(
                    c.dati,
                    null,
                    2
                  )}

                </pre>

              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">

                <Clock3 className="w-4 h-4" />

                {new Date(
                  c.created_at
                ).toLocaleString(
                  'it-IT'
                )}

              </div>

            </div>
          )
        )}

      </div>

    </div>
    </div>
  );
}