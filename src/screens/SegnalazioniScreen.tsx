import {
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  DoorOpen,
  Store,
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

interface Props {
  /** Non usato: i dati arrivano già via sottoscrizione realtime (vedi sotto).
      Accettato solo per compatibilità con la prop passata da App.tsx. */
  refreshKey?: number;
}

export default function SegnalazioniScreen(_props: Props) {

  const [
    contributi,
    setContributi,
  ] = useState<
    Contributo[]
  >([]);

  const [loading, setLoading] =
    useState(true);

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
