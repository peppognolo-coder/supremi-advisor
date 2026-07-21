import { useState } from 'react';
import { useScrollLock } from '../lib/useScrollLock';

import {
  X,
  Info,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { useSwipeDown } from '../lib/useSwipeDown';

interface Props {
  salettaId: string;
  onClose: () => void;
}

// =============================================================================
// TIPI DI SEGNALAZIONE PER SEZIONE
// Ogni sezione mostra solo le opzioni pertinenti.
// { value: chiave nel payload, label: testo mostrato all'utente }
// =============================================================================

const TIPI_PER_SEZIONE: Record<string, { value: string; label: string }[]> = {
  equipaggi: [
    { value: 'climatizzata',        label: 'Climatizzazione presente' },
    { value: 'remove_climatizzata', label: 'Climatizzazione assente' },
    { value: 'microonde',           label: 'Microonde presente' },
    { value: 'remove_microonde',    label: 'Microonde assente' },
    { value: 'fontana_acqua',       label: 'Fontana acqua presente' },
    { value: 'remove_fontana_acqua',label: 'Fontana acqua assente' },
    { value: 'distributori',        label: 'Distributori presenti' },
    { value: 'remove_distributori', label: 'Distributori assenti' },
    { value: 'codice_accesso',      label: 'Nuovo codice accesso' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  bagni: [
    { value: 'stato_aperti',        label: 'Bagni aperti' },
    { value: 'stato_chiusi',        label: 'Bagni chiusi' },
    { value: 'modalita_libero',     label: 'Accesso libero' },
    { value: 'modalita_chiave',     label: 'Accesso con chiave' },
    { value: 'modalita_codice',     label: 'Accesso con codice' },
    { value: 'modalita_badge',      label: 'Accesso con badge' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  cancelletto: [
    { value: 'codice_accesso',      label: 'Nuovo codice accesso' },
    { value: 'tipologia_badge',     label: 'Accesso con badge' },
    { value: 'tipologia_tastierino',label: 'Accesso con tastierino' },
    { value: 'tipologia_citofono',  label: 'Accesso con citofono' },
    { value: 'tipologia_manuale',   label: 'Apertura manuale' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  trenitalia: [
    { value: 'stato_aperto',        label: 'Locale aperto' },
    { value: 'stato_chiuso',        label: 'Locale chiuso' },
    { value: 'codice_accesso',      label: 'Nuovo codice accesso' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  spogliatoi: [
    { value: 'stato_aperti',        label: 'Spogliatoi aperti' },
    { value: 'stato_chiusi',        label: 'Spogliatoi chiusi' },
    { value: 'docce_presenti',      label: 'Docce presenti' },
    { value: 'docce_assenti',       label: 'Docce assenti' },
    { value: 'armadietti_presenti', label: 'Armadietti presenti' },
    { value: 'armadietti_assenti',  label: 'Armadietti assenti' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  segreteria: [
    { value: 'stato_aperta',        label: 'Segreteria aperta' },
    { value: 'stato_chiusa',        label: 'Segreteria chiusa' },
    { value: 'orari',               label: 'Aggiorna orari' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
  versamenti: [
    { value: 'stato_aperto',        label: 'Ufficio aperto' },
    { value: 'stato_chiuso',        label: 'Ufficio chiuso' },
    { value: 'orari',               label: 'Aggiorna orari' },
    { value: 'ubicazione',          label: 'Nuova ubicazione' },
    { value: 'note',                label: 'Nuove note' },
  ],
};

// Campi che richiedono un input testuale aggiuntivo
const RICHIEDE_VALORE = ['codice_accesso', 'ubicazione', 'note', 'orari'];

export default function SegnalazioneModal({
  salettaId,
  onClose,
}: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose: onClose });
  useScrollLock();


  const [sezione, setSezione] =
    useState('equipaggi');

  const [tipo, setTipo] =
    useState(TIPI_PER_SEZIONE['equipaggi'][0].value);

  const [valore, setValore] =
    useState('');

  const [nota, setNota] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // Al cambio sezione: reset del tipo alla prima opzione disponibile
  function handleSezioneChange(nuovaSezione: string) {
    setSezione(nuovaSezione);
    setTipo(TIPI_PER_SEZIONE[nuovaSezione][0].value);
    setValore('');
  }

  const tipiDisponibili = TIPI_PER_SEZIONE[sezione] ?? [];

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
          sezione,
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

  const requiresValue = RICHIEDE_VALORE.includes(tipo);

  return (

    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">

      <div ref={panelRef} style={dragStyle} onTouchStart={handleDragStart} className="bg-white rounded-3xl p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
          {/* DRAG INDICATOR */}
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

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

        {/* SEZIONE */}
        <div className="flex flex-col gap-1.5">

          <label className="text-sm font-medium text-gray-700">
            Sezione della località
          </label>

          <select
            value={sezione}
            onChange={(e) => handleSezioneChange(e.target.value)}
            className="border border-gray-200 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
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

        {/* TIPO */}
        <div className="flex flex-col gap-1.5">

          <label className="text-sm font-medium text-gray-700">

            Tipo segnalazione

          </label>

          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setValore(''); }}
            className="border border-gray-200 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
          >
            {tipiDisponibili.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
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
              className="border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
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
            className="border border-gray-200 rounded-2xl px-4 py-3 text-base min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
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
