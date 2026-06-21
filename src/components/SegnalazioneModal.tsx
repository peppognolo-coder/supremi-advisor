import { useState } from 'react';

import {
  X,
  Info,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

interface Props {
  salettaId: string;
  onClose: () => void;
}

export default function SegnalazioneModal({
  salettaId,
  onClose,
}: Props) {

  const [tipo, setTipo] =
    useState('microonde');

  const [valore, setValore] =
    useState('');

  const [nota, setNota] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  async function submit() {

    setLoading(true);

    // =========================
    // Inserisce in contributi
    // così appare in pending admin
    // =========================

    const { error } = await supabase
      .from('contributi')
      .insert({
        tipo: 'segnalazione_saletta',
        dati: {
          saletta_id: salettaId,
          tipo,
          valore: valore.trim() || null,
          nota: nota.trim() || null,
        },
        stato: 'pending',
      });

    if (error) {

      console.error(error);

      toast.error(
        'Errore invio segnalazione'
      );

    } else {

      toast.success(
        'Segnalazione inviata, grazie!'
      );

      onClose();
    }

    setLoading(false);
  }

  // =========================
  // INPUT VISIBILITY
  // =========================

  const requiresValue =
    [
      'codice_accesso',
      'ubicazione',
      'note',
    ].includes(tipo);

  return (

    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">

      <div className="bg-white rounded-3xl p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">

              <Info className="w-5 h-5 text-trenord-green" />

            </div>

            <div>

              <h2 className="text-lg font-semibold text-gray-900">
                Modifica informazioni saletta
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Aiutaci a mantenere aggiornati i dati della saletta
              </p>

              <p className="text-xs text-gray-400 mt-0.5">

                Contributo collaborativo

              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >

            <X className="w-5 h-5 text-gray-400" />

          </button>

        </div>

        {/* TIPO */}
        <div className="flex flex-col gap-1.5">

          <label className="text-sm font-medium text-gray-700">

            Tipo segnalazione

          </label>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value)
            }
            className="border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
          >

            <option value="climatizzata">
              Climatizzazione presente
            </option>

            <option value="remove_climatizzata">
              Climatizzazione assente
            </option>

            <option value="microonde">
              Microonde presente
            </option>

            <option value="remove_microonde">
              Microonde assente
            </option>

            <option value="fontana_acqua">
              Fontana acqua presente
            </option>

            <option value="remove_fontana_acqua">
              Fontana acqua assente
            </option>

            <option value="distributori">
              Distributori presenti
            </option>

            <option value="remove_distributori">
              Distributori assenti
            </option>

            <option value="codice_accesso">
              Nuovo codice accesso
            </option>

            <option value="ubicazione">
              Nuova ubicazione
            </option>

            <option value="note">
              Nuove note
            </option>

          </select>

        </div>

        {/* VALORE */}
        {requiresValue && (

          <div className="flex flex-col gap-1.5">

            <label className="text-sm font-medium text-gray-700">

              Valore

            </label>

            <input
              type="text"
              value={valore}
              onChange={(e) =>
                setValore(e.target.value)
              }
              placeholder="Inserisci informazione"
              className="border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
            />

          </div>
        )}

        {/* NOTE */}
        <div className="flex flex-col gap-1.5">

          <label className="text-sm font-medium text-gray-700">

            Note aggiuntive

          </label>

          <textarea
            value={nota}
            onChange={(e) =>
              setNota(e.target.value)
            }
            placeholder="Informazioni opzionali"
            className="border border-gray-200 rounded-2xl px-4 py-3 text-sm min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
          />

        </div>

        {/* BUTTON */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green hover:opacity-90 transition-opacity text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50"
        >

          {loading
            ? 'Invio...'
            : 'Invia segnalazione'}

        </button>

      </div>

    </div>
  );
}
