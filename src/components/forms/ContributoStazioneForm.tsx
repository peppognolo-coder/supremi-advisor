import { useState } from 'react';

import {
  ArrowLeft,
  Train,
  MapPin,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {

  onBack: () => void;
}

export default function ContributoStazioneForm({
  onBack,
}: Props) {

  // =========================
  // STATE
  // =========================

  const [nome, setNome] =
    useState('');

  const [regione, setRegione] =
    useState('');

  const [provincia, setProvincia] =
    useState('');

  const [indirizzo, setIndirizzo] =
    useState('');

  const [mapsQuery, setMapsQuery] =
    useState('');

  const [lat, setLat] =
    useState('');

  const [lng, setLng] =
    useState('');

  const [plusCode, setPlusCode] =
    useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================
  // SUBMIT
  // =========================

  async function submit() {

    // =====================
    // VALIDATION
    // =====================

    if (!nome.trim()) {

      toast.error(
        'Inserisci nome stazione'
      );

      return;
    }

    setLoading(true);

    try {

      // =====================
      // PAYLOAD
      // =====================

      const payload = {

        nome:
          nome.trim(),

        regione:
          regione.trim(),

        provincia:
          provincia.trim(),

        indirizzo:
          indirizzo.trim(),

        maps_query:
          mapsQuery.trim(),

        lat:
          lat.trim(),

        lng:
          lng.trim(),

        plus_code:
          plusCode.trim(),

        note:
          note.trim(),
      };

      // =====================
      // INSERT
      // =====================

      const { error } =
        await supabase

          .from('contributi')

          .insert({

            tipo: 'stazione',

            dati: payload,

            stato: 'pending',
          });

      // =====================
      // ERROR
      // =====================

      if (error) {

        console.error(error);

        toast.error(
          'Errore invio contributo'
        );

        setLoading(false);

        return;
      }

      // =====================
      // SUCCESS
      // =====================

      toast.success(
        'Stazione inviata con successo'
      );

      setLoading(false);

      onBack();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore imprevisto'
      );

      setLoading(false);
    }
  }

  return (

    <div className="flex flex-col gap-4">

      {/* BACK */}
      <button
        onClick={onBack}
        className="self-start px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm"
      >

        <div className="flex items-center gap-2">

          <ArrowLeft className="w-4 h-4" />

          Indietro

        </div>

      </button>

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Nuova stazione

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Invia una nuova stazione ferroviaria

        </p>

      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* NOME */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Nome stazione

          </label>

          <div className="relative mt-1">

            <Train className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={nome}
              onChange={(e) =>
                setNome(
                  e.target.value
                )
              }
              placeholder="Es. Milano Centrale"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* REGIONE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Regione

          </label>

          <input
            value={regione}
            onChange={(e) =>
              setRegione(
                e.target.value
              )
            }
            placeholder="Es. Lombardia"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* PROVINCIA */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Provincia

          </label>

          <input
            value={provincia}
            onChange={(e) =>
              setProvincia(
                e.target.value
              )
            }
            placeholder="Es. Milano"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* INDIRIZZO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Indirizzo

          </label>

          <div className="relative mt-1">

            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={indirizzo}
              onChange={(e) =>
                setIndirizzo(
                  e.target.value
                )
              }
              placeholder="Es. Piazza Duca d'Aosta"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* MAPS QUERY */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Maps Query

          </label>

          <input
            value={mapsQuery}
            onChange={(e) =>
              setMapsQuery(
                e.target.value
              )
            }
            placeholder="Es. Milano Centrale stazione ferroviaria"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* LAT */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Latitudine

          </label>

          <input
            value={lat}
            onChange={(e) =>
              setLat(
                e.target.value
              )
            }
            placeholder="45.484"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* LNG */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Longitudine

          </label>

          <input
            value={lng}
            onChange={(e) =>
              setLng(
                e.target.value
              )
            }
            placeholder="9.204"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* PLUS CODE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Plus Code

          </label>

          <input
            value={plusCode}
            onChange={(e) =>
              setPlusCode(
                e.target.value
              )
            }
            placeholder="F4Q5+XX Milano"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* NOTE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Note

          </label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            placeholder="Informazioni aggiuntive..."
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px]"
          />

        </div>

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >

          {loading
            ? 'Invio...'
            : 'Invia contributo'}

        </button>

      </div>

    </div>
  );
}
