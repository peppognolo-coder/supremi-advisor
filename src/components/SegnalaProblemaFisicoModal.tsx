import { useState } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { TIPI_PROBLEMA_SALETTA } from '../lib/adminApi';

// =========================
// PROPS
// =========================

interface Props {
  salettaId: string;
  salettaNome?: string;
  onClose: () => void;
}

// =========================
// COMPONENTE
// =========================

export default function SegnalaProblemaFisicoModal({
  salettaId,
  salettaNome,
  onClose,
}: Props) {

  const [tipoSelezionato, setTipoSelezionato] = useState('');
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!tipoSelezionato) {
      toast.error('Seleziona il tipo di problema');
      return;
    }

    setLoading(true);

    try {
      // Cerca problema aperto della stessa saletta e tipo
      const { data: existing } = await supabase
        .from('saletta_problemi')
        .select('id, segnalazioni_count')
        .eq('saletta_id', salettaId)
        .eq('tipo_problema', tipoSelezionato)
        .eq('stato', 'aperta')
        .maybeSingle();

      if (existing) {
        // Incrementa segnalazioni_count
        const { error } = await supabase
          .from('saletta_problemi')
          .update({
            segnalazioni_count: existing.segnalazioni_count + 1,
            ...(note.trim() ? { note: note.trim() } : {}),
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('Grazie! La tua segnalazione si aggiunge alle precedenti.');
      } else {
        // Crea nuovo problema
        const { error } = await supabase
          .from('saletta_problemi')
          .insert({
            saletta_id:      salettaId,
            tipo_problema:   tipoSelezionato,
            note:            note.trim() || null,
            stato:           'aperta',
            segnalazioni_count: 1,
          });

        if (error) throw error;
        toast.success('Problema segnalato. Il team lo verificherà al più presto.');
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Errore durante la segnalazione. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md flex flex-col gap-0 max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Segnala problema</h2>
              {salettaNome && (
                <p className="text-xs text-gray-500 mt-0.5">{salettaNome}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 flex flex-col gap-4">

          {/* TIPO PROBLEMA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Tipo di problema *
            </label>
            <div className="flex flex-col gap-2">
              {TIPI_PROBLEMA_SALETTA.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoSelezionato(tipo)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    tipoSelezionato === tipo
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* NOTE */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Note aggiuntive (opzionale)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Descrivi il problema in modo più dettagliato..."
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="button"
            onClick={submit}
            disabled={loading || !tipoSelezionato}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Invio...' : '🚨 Segnala problema'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            La segnalazione viene inviata al team di manutenzione Trenord.
          </p>

        </div>

      </div>
    </div>
  );
}
