import { useState } from 'react';
import { useScrollLock } from '../lib/useScrollLock';

import {
  X,
  AlertTriangle,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { getDeviceId } from '../lib/device';

import { useSwipeDown } from '../lib/useSwipeDown';

// =========================
// TIPI PROBLEMA
// =========================

const TIPI_PROBLEMA = [
  {
    value: 'codice_accesso_errato',
    label: 'Codice accesso errato',
  },
  {
    value: 'saletta_chiusa',
    label: 'Saletta chiusa',
  },
  {
    value: 'dotazioni_non_corrette',
    label: 'Dotazioni non corrette',
  },
  {
    value: 'ubicazione_errata',
    label: 'Ubicazione errata',
  },
  {
    value: 'informazioni_obsolete',
    label: 'Informazioni obsolete',
  },
  {
    value: 'altro',
    label: 'Altro',
  },
];

interface Props {

  salettaId: string;

  onClose: () => void;

  onSuccess: () => void;
}

export default function SegnalaProblemaModal({
  salettaId,
  onClose,
  onSuccess,
}: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose: onClose });
  useScrollLock();


  const [tipoProblem, setTipoProblema] =
    useState<string>('');

  const [nota, setNota] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================
  // SUBMIT
  // =========================

  async function submit() {

    if (!tipoProblem) {

      toast.error(
        'Seleziona il tipo di problema'
      );

      return;
    }

    setLoading(true);

    try {

      const { error } =
        await supabase
          .from('saletta_verifiche')
          .insert({
            saletta_id: salettaId,
            is_correct: false,
            device_id: getDeviceId(),
            tipo_problema: tipoProblem,
            nota: nota.trim() || null,
          });

      if (error) {

        console.error(error);

        toast.error(
          'Errore invio segnalazione'
        );

        return;
      }

      toast.success(
        'Segnalazione inviata, grazie!'
      );

      onSuccess();

      onClose();

    } catch (err) {

      console.error(err);

      toast.error('Errore imprevisto');

    } finally {

      setLoading(false);
    }
  }

  return (

    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end justify-center p-4">

      <div ref={panelRef} style={dragStyle} onTouchStart={handleDragStart} className="bg-white rounded-3xl w-full max-w-md flex flex-col gap-4 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
          {/* DRAG INDICATOR */}
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">

              <AlertTriangle className="w-5 h-5 text-amber-500" />

            </div>

            <div>

              <h2 className="text-base font-semibold text-gray-900">

                Segnala un problema

              </h2>

              <p className="text-xs text-gray-400">

                Seleziona il problema principale

              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >

            <X className="w-4 h-4 text-gray-400" />

          </button>

        </div>

        {/* RADIO OPTIONS */}
        <div className="flex flex-col gap-2">

          {TIPI_PROBLEMA.map((tipo) => (

            <label
              key={tipo.value}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                tipoProblem === tipo.value
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >

              <input
                type="radio"
                name="tipo_problema"
                value={tipo.value}
                checked={tipoProblem === tipo.value}
                onChange={() =>
                  setTipoProblema(tipo.value)
                }
                className="accent-amber-500 text-base"
              />

              <span className="text-sm font-medium">

                {tipo.label}

              </span>

            </label>
          ))}

        </div>

        {/* NOTA OPZIONALE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Note aggiuntive (opzionale)

          </label>

          <textarea
            value={nota}
            onChange={(e) =>
              setNota(e.target.value)
            }
            placeholder="Descrivi il problema con più dettagli..."
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
          />

        </div>

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading || !tipoProblem}
          className="bg-amber-500 text-white rounded-xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >

          {loading
            ? 'Invio...'
            : 'Invia segnalazione'}

        </button>

      </div>

    </div>
  );
}
