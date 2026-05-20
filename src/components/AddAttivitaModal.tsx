import { useState } from 'react';

import {
  X,
  Store,
  Clock3,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

interface Props {

  stazioneId: string;

  onClose: () => void;
}

const GIORNI = [

  'lun',
  'mar',
  'mer',
  'gio',
  'ven',
  'sab',
  'dom',
];

export default function AddAttivitaModal({

  stazioneId,

  onClose,

}: Props) {

  const [loading, setLoading] =
    useState(false);

  const [nome, setNome] =
    useState('');

  const [categoria, setCategoria] =
    useState('bar');

  const [indirizzo, setIndirizzo] =
    useState('');

  const [mapsQuery, setMapsQuery] =
    useState('');

  const [ubicazione, setUbicazione] =
    useState('');

  const [note, setNote] =
    useState('');

  const [convenzionato, setConvenzionato] =
    useState(false);

  const [
    orarioApertura,
    setOrarioApertura,
  ] = useState('');

  const [
    orarioChiusura,
    setOrarioChiusura,
  ] = useState('');

  const [giorni, setGiorni] =
    useState<string[]>([]);

  function toggleGiorno(
    giorno: string
  ) {

    setGiorni((prev) =>

      prev.includes(giorno)

        ? prev.filter(
            (g) =>
              g !== giorno
          )

        : [...prev, giorno]
    );
  }

  async function submit() {

    if (!nome.trim()) {

      alert(
        'Inserisci nome attività'
      );

      return;
    }

    try {

      setLoading(true);

      const payload = {

        stazione_id:
          stazioneId,

        nome,

        categoria,

        indirizzo,

        maps_query:
          mapsQuery,

        ubicazione,

        note,

        convenzionato,

        giorni_apertura:
          giorni,

        orario_apertura:
          orarioApertura,

        orario_chiusura:
          orarioChiusura,
      };

      console.log(
        'PAYLOAD:',
        payload
      );

      const response =
        await supabase

          .from('contributi')

          .insert({

            tipo: 'attivita',

            dati: payload,

            stato: 'pending',
          });

      console.log(
        'SUPABASE RESPONSE:',
        response
      );

      const error =
        response.error;

      if (error) {

        console.error(error);

        alert(
          JSON.stringify(
            error,
            null,
            2
          )
        );

        return;
      }

      alert(
        'Proposta inviata per approvazione'
      );

      onClose();

    } catch (err) {

      console.error(err);

      alert(
        JSON.stringify(
          err,
          null,
          2
        )
      );

    } finally {

      setLoading(false);
    }
  }

  return (

    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-4 overflow-y-auto">

      <div className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto pb-32 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 my-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <Store className="w-5 h-5 text-trenord-green" />

            <h2 className="text-lg font-semibold">

              Aggiungi attività

            </h2>

          </div>

          <button
            onClick={onClose}
          >

            <X className="w-5 h-5 text-gray-400" />

          </button>

        </div>

        {/* NOME */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Nome attività

          </label>

          <input
            type="text"
            value={nome}
            onChange={(e) =>
              setNome(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm"
            placeholder="Es. McDonald's"
          />

        </div>

        {/* CATEGORIA */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Categoria

          </label>

          <select
            value={categoria}
            onChange={(e) =>
              setCategoria(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm"
          >

            <option value="bar">

              Bar

            </option>

            <option value="fast_food">

              Fast Food

            </option>

            <option value="supermercato">

              Supermercato

            </option>

            <option value="farmacia">

              Farmacia

            </option>

            <option value="tabacchi">

              Tabacchi

            </option>

          </select>

        </div>

        {/* INDIRIZZO */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Indirizzo

          </label>

          <input
            type="text"
            value={indirizzo}
            onChange={(e) =>
              setIndirizzo(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm"
            placeholder="Via / Piazza..."
          />

        </div>

        {/* MAPS */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Maps Query

          </label>

          <input
            type="text"
            value={mapsQuery}
            onChange={(e) =>
              setMapsQuery(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm"
            placeholder="Ricerca Google Maps"
          />

        </div>

        {/* UBICAZIONE */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Ubicazione

          </label>

          <input
            type="text"
            value={ubicazione}
            onChange={(e) =>
              setUbicazione(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm"
            placeholder="In stazione / lato binari..."
          />

        </div>

        {/* GIORNI */}
        <div className="flex flex-col gap-2">

          <label className="text-sm font-medium">

            Giorni apertura

          </label>

          <div className="flex flex-wrap gap-2">

            {GIORNI.map(
              (giorno) => {

                const active =
                  giorni.includes(
                    giorno
                  );

                return (

                  <button
                    key={giorno}
                    type="button"
                    onClick={() =>
                      toggleGiorno(
                        giorno
                      )
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active

                        ? 'bg-trenord-green text-white'

                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >

                    {giorno.toUpperCase()}

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* ORARI */}
        <div className="grid grid-cols-2 gap-3">

          <div className="flex flex-col gap-1">

            <label className="text-sm font-medium flex items-center gap-1">

              <Clock3 className="w-4 h-4" />

              Apertura

            </label>

            <input
              type="time"
              value={
                orarioApertura
              }
              onChange={(e) =>
                setOrarioApertura(
                  e.target.value
                )
              }
              className="border rounded-2xl px-3 py-3 text-sm"
            />

          </div>

          <div className="flex flex-col gap-1">

            <label className="text-sm font-medium flex items-center gap-1">

              <Clock3 className="w-4 h-4" />

              Chiusura

            </label>

            <input
              type="time"
              value={
                orarioChiusura
              }
              onChange={(e) =>
                setOrarioChiusura(
                  e.target.value
                )
              }
              className="border rounded-2xl px-3 py-3 text-sm"
            />

          </div>

        </div>

        {/* CONVENZIONE */}
        <button
          type="button"
          onClick={() =>
            setConvenzionato(
              !convenzionato
            )
          }
          className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
            convenzionato

              ? 'bg-emerald-50 border-emerald-200'

              : 'bg-white border-gray-200'
          }`}
        >

          <span className="text-sm font-medium">

            Locale convenzionato

          </span>

          <div
            className={`w-5 h-5 rounded-full border-2 ${
              convenzionato

                ? 'bg-emerald-500 border-emerald-500'

                : 'border-gray-300'
            }`}
          />

        </button>

        {/* NOTE */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">

            Note

          </label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            className="border rounded-2xl px-3 py-3 text-sm min-h-[100px]"
            placeholder="Informazioni aggiuntive"
          />

        </div>

        {/* BUTTON */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-2xl py-4 font-semibold text-sm sticky bottom-0"
        >

          {loading

            ? 'Invio proposta...'

            : 'Invia proposta'}

        </button>

      </div>

    </div>
  );
}