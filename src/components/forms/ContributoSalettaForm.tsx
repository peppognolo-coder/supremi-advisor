import { useState } from 'react';

import {
  ArrowLeft,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {
  onBack: () => void;
}

const stati = [
  'Aperta',
  'Chiusa',
  'Pulizie',
  'Guasto',
];

const tipi = [
  'Equipaggi',
  'Bagni',
  'Cancelletto',
  'Trenitalia',
  'Sala Relax',
];

export default function ContributoSalettaForm({
  onBack,
}: Props) {

  // =========================
  // FORM STATE
  // =========================

  const [stazione, setStazione] =
    useState('');

  const [tipo, setTipo] =
    useState(tipi[0]);

  const [codice, setCodice] =
    useState('');

  const [ubicazione, setUbicazione] =
    useState('');

  const [stato, setStato] =
    useState(stati[0]);

  const [note, setNote] =
    useState('');

  const [microonde, setMicroonde] =
    useState(false);

  const [distributori, setDistributori] =
    useState(false);

  const [acqua, setAcqua] =
    useState(false);

  const [climatizzata, setClimatizzata] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =========================
  // SUBMIT
  // =========================

  async function submit() {

    if (!stazione.trim()) {

      toast.error(
        'Inserisci una stazione'
      );

      return;
    }

    setLoading(true);

    try {

      const payload = {

        stazione,

        tipo,

        codice_accesso:
          codice,

        ubicazione,

        stato,

        note,

        microonde,

        distributori,

        acqua,

        climatizzata,
      };

      console.log(
        'PAYLOAD:',
        payload
      );

      const response =
        await supabase
          .from('contributi')
          .insert({

            tipo: 'saletta',

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

        console.error(
          'SUPABASE ERROR:',
          error
        );

        alert(
          JSON.stringify(
            error,
            null,
            2
          )
        );

        toast.error(
          error.message ||
          'Errore invio contributo'
        );

        setLoading(false);

        return;
      }

      toast.success(
        'Contributo inviato con successo'
      );

      setLoading(false);

      onBack();

    } catch (err: any) {

      console.error(
        'CATCH ERROR:',
        err
      );

      alert(
        JSON.stringify(
          err,
          null,
          2
        )
      );

      toast.error(
        err?.message ||
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

          Contributo Saletta

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Invia nuove informazioni o aggiornamenti

        </p>

      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Stazione

          </label>

          <input
            value={stazione}
            onChange={(e) =>
              setStazione(
                e.target.value
              )
            }
            placeholder="Es. Milano Centrale"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* TIPO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Tipo

          </label>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value
              )
            }
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          >

            {tipi.map((tipo) => (

              <option
                key={tipo}
              >

                {tipo}

              </option>
            ))}

          </select>

        </div>

        {/* CODICE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Codice accesso

          </label>

          <input
            value={codice}
            onChange={(e) =>
              setCodice(
                e.target.value
              )
            }
            placeholder="Es. 14579B"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* UBICAZIONE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Ubicazione

          </label>

          <input
            value={ubicazione}
            onChange={(e) =>
              setUbicazione(
                e.target.value
              )
            }
            placeholder="Es. Binario 1 lato Milano"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* STATO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Stato

          </label>

          <select
            value={stato}
            onChange={(e) =>
              setStato(
                e.target.value
              )
            }
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          >

            {stati.map((stato) => (

              <option
                key={stato}
              >

                {stato}

              </option>
            ))}

          </select>

        </div>

        {/* SERVIZI */}
        <div className="flex flex-col gap-3">

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Servizi

          </label>

          {/* MICROONDE */}
          <button
            type="button"
            onClick={() =>
              setMicroonde(
                !microonde
              )
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              microonde
                ? 'bg-trenord-green text-white border-trenord-green'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >

            <div className="flex items-center gap-3">

              <Microwave className="w-5 h-5" />

              Microonde

            </div>

            <span>

              {microonde
                ? 'SI'
                : 'NO'}

            </span>

          </button>

          {/* DISTRIBUTORI */}
          <button
            type="button"
            onClick={() =>
              setDistributori(
                !distributori
              )
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              distributori
                ? 'bg-trenord-green text-white border-trenord-green'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >

            <div className="flex items-center gap-3">

              <Coffee className="w-5 h-5" />

              Distributori

            </div>

            <span>

              {distributori
                ? 'SI'
                : 'NO'}

            </span>

          </button>

          {/* ACQUA */}
          <button
            type="button"
            onClick={() =>
              setAcqua(!acqua)
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              acqua
                ? 'bg-trenord-green text-white border-trenord-green'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >

            <div className="flex items-center gap-3">

              <Droplets className="w-5 h-5" />

              Acqua

            </div>

            <span>

              {acqua
                ? 'SI'
                : 'NO'}

            </span>

          </button>

          {/* CLIMA */}
          <button
            type="button"
            onClick={() =>
              setClimatizzata(
                !climatizzata
              )
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              climatizzata
                ? 'bg-trenord-green text-white border-trenord-green'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >

            <div className="flex items-center gap-3">

              <Snowflake className="w-5 h-5" />

              Climatizzata

            </div>

            <span>

              {climatizzata
                ? 'SI'
                : 'NO'}

            </span>

          </button>

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
            placeholder="Inserisci eventuali informazioni aggiuntive..."
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