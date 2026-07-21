import { useState } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { useSwipeDown } from '../lib/useSwipeDown';

import { useScrollLock } from '../lib/useScrollLock';

// =============================================================================
// PROBLEMI PER SEZIONE
// Ogni sezione mostra solo i problemi fisici pertinenti.
// =============================================================================

const PROBLEMI_PER_SEZIONE: Record<string, string[]> = {
  equipaggi: [
    'Climatizzazione guasta',
    'Microonde guasto',
    'Distributori non funzionanti',
    'Fontana acqua guasta',
    'Porta danneggiata',
    'Finestra danneggiata',
    'Sedie o tavoli rotti',
    'Saletta sporca',
    'Presenza insetti o animali',
    'Illuminazione guasta',
    'Altro',
  ],
  bagni: [
    'Bagni chiusi',
    'Bagni sporchi',
    'Guasto idraulico',
    'Illuminazione guasta',
    'Porta danneggiata',
    'Presenza insetti o animali',
    'Altro',
  ],
  cancelletto: [
    'Cancelletto bloccato',
    'Cancelletto danneggiato',
    'Codice non funzionante',
    'Badge non riconosciuto',
    'Citofono non funzionante',
    'Altro',
  ],
  trenitalia: [
    'Locale chiuso',
    'Porta danneggiata',
    'Illuminazione guasta',
    'Climatizzazione guasta',
    'Altro',
  ],
  spogliatoi: [
    'Spogliatoi chiusi',
    'Docce non funzionanti',
    'Armadietti danneggiati',
    'Spogliatoi sporchi',
    'Illuminazione guasta',
    'Presenza insetti o animali',
    'Altro',
  ],
  segreteria: [
    'Segreteria chiusa',
    'Orari non aggiornati',
    'Altro',
  ],
  versamenti: [
    'Ufficio chiuso',
    'Orari non aggiornati',
    'Altro',
  ],
};

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

  useScrollLock();

  // Swipe-down applicato SOLO all'handle, non al body scrollabile
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });

  const [sezione, setSezione]                     = useState('equipaggi');
  const [tipoSelezionato, setTipoSelezionato]     = useState('');
  const [note, setNote]                           = useState('');
  const [loading, setLoading]                     = useState(false);

  const tipiDisponibili = PROBLEMI_PER_SEZIONE[sezione] ?? [];

  function handleSezioneChange(nuovaSezione: string) {
    setSezione(nuovaSezione);
    setTipoSelezionato(''); // reset: la selezione precedente non vale per la nuova sezione
  }

  async function submit() {
    if (!tipoSelezionato) {
      toast.error('Seleziona il tipo di problema');
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('saletta_problemi')
        .select('id, segnalazioni_count')
        .eq('saletta_id', salettaId)
        .eq('tipo_problema', tipoSelezionato)
        .eq('stato', 'aperta')
        .maybeSingle();

      if (existing) {
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
        const { error } = await supabase
          .from('saletta_problemi')
          .insert({
            saletta_id:         salettaId,
            tipo_problema:      tipoSelezionato,
            sezione:            sezione,
            note:               note.trim() || null,
            stato:              'aperta',
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
      className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
        PANNELLO: overflow-hidden + flex-col
        Il drag-handle in cima attiva lo swipe-down.
        Il body sotto scorre liberamente con overflow-y-auto.
      */}
      <div
        ref={panelRef}
        style={dragStyle}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md flex flex-col max-h-[90vh] overflow-hidden"
      >

        {/* ── DRAG HANDLE (attiva swipe-down) ── */}
        <div
          onTouchStart={handleDragStart}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          {/* Pill indicatore */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-2 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Segnala guasto</h2>
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
        </div>
        {/* ── FINE DRAG HANDLE ── */}

        {/* ── BODY SCROLLABILE (indipendente dal drag) ── */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 flex flex-col gap-4">

            {/* SEZIONE */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Sezione della località
              </label>
              <select
                value={sezione}
                onChange={(e) => handleSezioneChange(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-base bg-white"
              >
                <option value="equipaggi">Saletta equipaggi</option>
                <option value="bagni">Bagni</option>
                <option value="cancelletto">Cancelletto</option>
                <option value="trenitalia">Locali Trenitalia</option>
                <option value="spogliatoi">Spogliatoi</option>
                <option value="segreteria">Segreteria</option>
                <option value="versamenti">Ufficio versamenti</option>
              </select>
            </div>

            {/* TIPO PROBLEMA */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Tipo di problema *
              </label>
              <div className="flex flex-col gap-2">
                {tipiDisponibili.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoSelezionato(tipo)}
                    className={`text-left px-4 py-3 rounded-xl border text-base font-medium transition-colors ${
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
                className="border border-gray-200 rounded-xl px-3 py-2 text-base resize-none"
              />
            </div>

            {/* SUBMIT */}
            <button
              type="button"
              onClick={submit}
              disabled={loading || !tipoSelezionato}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 text-white font-medium text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Invio...' : '🚨 Segnala guasto'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              La segnalazione viene inviata al team di manutenzione Trenord.
            </p>

          </div>
        </div>
        {/* ── FINE BODY SCROLLABILE ── */}

      </div>
    </div>
  );
}
