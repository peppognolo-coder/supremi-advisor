import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  X,
  Clock3,
  Store,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

export default function AdminAttivitaSegnalazioni() {

  const [
    segnalazioni,
    setSegnalazioni,
  ] = useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    load();

  }, []);

  async function load() {

    try {

      setLoading(true);

      const { data } =
        await supabase

          .from(
            'attivita_stazione_segnalazioni'
          )

          .select(`
            *,
            stazioni(nome)
          `)

          .eq(
            'stato',
            'pending'
          )

          .order(
            'created_at',
            {
              ascending: false,
            }
          );

      setSegnalazioni(
        data || []
      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  }

  async function approve(
    segnalazione: any
  ) {

    try {

      const { error } =
        await supabase

          .from(
            'attivita_stazione'
          )

          .insert({

            stazione_id:
              segnalazione.stazione_id,

            nome:
              segnalazione.nome,

            categoria:
              segnalazione.categoria,

            indirizzo:
              segnalazione.indirizzo,

            maps_query:
              segnalazione.maps_query,

            ubicazione:
              segnalazione.ubicazione,

            note:
              segnalazione.note,

            convenzionato:
              segnalazione.convenzionato,

            giorni_apertura:
              segnalazione.giorni_apertura,

            orario_apertura:
              segnalazione.orario_apertura,

            orario_chiusura:
              segnalazione.orario_chiusura,
          });

      if (error) {

        console.error(error);

        alert(
          'Errore approvazione'
        );

        return;
      }

      await supabase

        .from(
          'attivita_stazione_segnalazioni'
        )

        .update({
          stato: 'approved',
        })

        .eq(
          'id',
          segnalazione.id
        );

      load();

    } catch (err) {

      console.error(err);
    }
  }

  async function reject(
    id: string
  ) {

    await supabase

      .from(
        'attivita_stazione_segnalazioni'
      )

      .update({
        stato: 'rejected',
      })

      .eq(
        'id',
        id
      );

    load();
  }

  if (loading) {

    return (

      <div className="text-sm text-gray-400">

        Caricamento...

      </div>
    );
  }

  if (
    segnalazioni.length === 0
  ) {

    return (

      <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center text-sm text-gray-400">

        Nessuna proposta attività pending

      </div>
    );
  }

  return (

    <div className="flex flex-col gap-4">

      {segnalazioni.map(
        (s) => (

          <div
            key={s.id}
            className="bg-white rounded-3xl border border-gray-100 p-5 flex flex-col gap-4"
          >

            <div className="flex items-start justify-between gap-3">

              <div className="flex items-start gap-3">

                <div className="w-11 h-11 rounded-2xl bg-trenord-green/10 flex items-center justify-center">

                  <Store className="w-5 h-5 text-trenord-green" />

                </div>

                <div>

                  <h3 className="text-sm font-semibold text-gray-900">

                    {s.nome}

                  </h3>

                  <p className="text-xs text-gray-400 mt-1">

                    {s.stazioni?.nome}

                  </p>

                  <p className="text-xs text-gray-500 capitalize mt-1">

                    {s.categoria.replace(
                      '_',
                      ' '
                    )}

                  </p>

                </div>

              </div>

              {s.convenzionato && (

                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase">

                  Convenzionato

                </span>
              )}

            </div>

            <div className="flex flex-col gap-2 text-xs text-gray-500">

              {s.indirizzo && (

                <p>

                  📍 {s.indirizzo}

                </p>
              )}

              {s.ubicazione && (

                <p>

                  🚉 {s.ubicazione}

                </p>
              )}

              {(s.orario_apertura ||
                s.orario_chiusura) && (

                <p className="flex items-center gap-1">

                  <Clock3 className="w-3.5 h-3.5" />

                  {s.orario_apertura} - {s.orario_chiusura}

                </p>
              )}

              {s.giorni_apertura &&
                s.giorni_apertura.length > 0 && (

                  <p>

                    📅 {s.giorni_apertura.join(
                      ', '
                    )}

                  </p>
                )}

              {s.note && (

                <p>

                  📝 {s.note}

                </p>
              )}

            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  approve(s)
                }
                className="flex-1 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center gap-2 text-sm font-semibold"
              >

                <Check className="w-4 h-4" />

                Approva

              </button>

              <button
                onClick={() =>
                  reject(s.id)
                }
                className="flex-1 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center gap-2 text-sm font-semibold"
              >

                <X className="w-4 h-4" />

                Rifiuta

              </button>

            </div>

          </div>
        )
      )}

    </div>
  );
}