import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../lib/useScrollLock';

import {
  X,
  Info,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { messaggioErroreInvio } from '../lib/rateLimitError';

import { useSwipeDown } from '../lib/useSwipeDown';

interface Props {
  salettaId: string;
  onClose: () => void;
}

// =============================================================================
// CAMPI PER SEZIONE
//
// Ogni sezione della Località Operativa (saletta equipaggi, bagni,
// cancelletto, locali Trenitalia, spogliatoi, segreteria, ufficio
// versamenti) ha i propri campi segnalabili. A differenza della versione
// precedente (un solo campo per invio), qui l'utente può selezionare più
// campi insieme e inviarli come un unico contributo — molto più comodo
// quando ci sono più cose da segnalare nella stessa visita.
//
// I "value" delle opzioni di tipo 'scelta' e le "key" dei campi di tipo
// 'testo' sono identici ai valori storici già gestiti da
// netlify/functions/admin-api.ts (case 'segnalazione_saletta'): cambiare
// qui la UI non richiede toccare il backend.
// =============================================================================

interface OpzioneScelta { value: string; label: string; }
interface CampoScelta { key: string; label: string; tipo: 'scelta'; opzioni: OpzioneScelta[]; }
interface CampoTesto  { key: string; label: string; tipo: 'testo'; placeholder?: string; }
type Campo = CampoScelta | CampoTesto;

interface Sezione { label: string; campi: Campo[]; }

const SEZIONI: Record<string, Sezione> = {
  equipaggi: {
    label: 'Saletta equipaggi',
    campi: [
      { key: 'climatizzata', label: 'Climatizzazione', tipo: 'scelta', opzioni: [
        { value: 'climatizzata', label: 'Presente' }, { value: 'remove_climatizzata', label: 'Assente' },
      ] },
      { key: 'microonde', label: 'Microonde', tipo: 'scelta', opzioni: [
        { value: 'microonde', label: 'Presente' }, { value: 'remove_microonde', label: 'Assente' },
      ] },
      { key: 'fontana_acqua', label: 'Fontana acqua', tipo: 'scelta', opzioni: [
        { value: 'fontana_acqua', label: 'Presente' }, { value: 'remove_fontana_acqua', label: 'Assente' },
      ] },
      { key: 'distributori', label: 'Distributori', tipo: 'scelta', opzioni: [
        { value: 'distributori', label: 'Presenti' }, { value: 'remove_distributori', label: 'Assenti' },
      ] },
      { key: 'codice_accesso', label: 'Nuovo codice accesso', tipo: 'testo' },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  bagni: {
    label: 'Bagni',
    campi: [
      { key: 'stato', label: 'Stato', tipo: 'scelta', opzioni: [
        { value: 'stato_aperti', label: 'Aperti' }, { value: 'stato_chiusi', label: 'Chiusi' },
      ] },
      { key: 'modalita', label: 'Modalità di accesso', tipo: 'scelta', opzioni: [
        { value: 'modalita_libero', label: 'Libero' }, { value: 'modalita_chiave', label: 'Chiave' },
        { value: 'modalita_codice', label: 'Codice' }, { value: 'modalita_badge', label: 'Badge' },
      ] },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  cancelletto: {
    label: 'Cancelletto',
    campi: [
      { key: 'tipologia', label: 'Tipologia accesso', tipo: 'scelta', opzioni: [
        { value: 'tipologia_badge', label: 'Badge' }, { value: 'tipologia_tastierino', label: 'Tastierino' },
        { value: 'tipologia_citofono', label: 'Citofono' }, { value: 'tipologia_manuale', label: 'Manuale' },
      ] },
      { key: 'codice_accesso', label: 'Nuovo codice accesso', tipo: 'testo' },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  trenitalia: {
    label: 'Locali Trenitalia',
    campi: [
      { key: 'stato', label: 'Stato', tipo: 'scelta', opzioni: [
        { value: 'stato_aperto', label: 'Aperto' }, { value: 'stato_chiuso', label: 'Chiuso' },
      ] },
      { key: 'codice_accesso', label: 'Nuovo codice accesso', tipo: 'testo' },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  spogliatoi: {
    label: 'Spogliatoi',
    campi: [
      { key: 'stato', label: 'Stato', tipo: 'scelta', opzioni: [
        { value: 'stato_aperti', label: 'Aperti' }, { value: 'stato_chiusi', label: 'Chiusi' },
      ] },
      { key: 'docce', label: 'Docce', tipo: 'scelta', opzioni: [
        { value: 'docce_presenti', label: 'Presenti' }, { value: 'docce_assenti', label: 'Assenti' },
      ] },
      { key: 'armadietti', label: 'Armadietti', tipo: 'scelta', opzioni: [
        { value: 'armadietti_presenti', label: 'Presenti' }, { value: 'armadietti_assenti', label: 'Assenti' },
      ] },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  segreteria: {
    label: 'Segreteria',
    campi: [
      { key: 'stato', label: 'Stato', tipo: 'scelta', opzioni: [
        { value: 'stato_aperta', label: 'Aperta' }, { value: 'stato_chiusa', label: 'Chiusa' },
      ] },
      { key: 'orari', label: 'Aggiorna orari', tipo: 'testo' },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
  versamenti: {
    label: 'Ufficio versamenti',
    campi: [
      { key: 'stato', label: 'Stato', tipo: 'scelta', opzioni: [
        { value: 'stato_aperto', label: 'Aperto' }, { value: 'stato_chiuso', label: 'Chiuso' },
      ] },
      { key: 'orari', label: 'Aggiorna orari', tipo: 'testo' },
      { key: 'ubicazione', label: 'Nuova ubicazione', tipo: 'testo' },
      { key: 'note', label: 'Nuove note', tipo: 'testo' },
    ],
  },
};

export default function SegnalazioneModal({
  salettaId,
  onClose,
}: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose: onClose });
  useScrollLock();

  const [sezioneId, setSezioneId] = useState('equipaggi');

  // Per i campi 'scelta': key del campo → value dell'opzione selezionata
  // (assente = non segnalato per quel campo).
  const [scelte, setScelte] = useState<Record<string, string>>({});

  // Per i campi 'testo': key del campo → testo inserito.
  const [testi, setTesti] = useState<Record<string, string>>({});

  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  const sezione = SEZIONI[sezioneId] ?? SEZIONI.equipaggi;

  function cambiaSezione(nuovaSezione: string) {
    setSezioneId(nuovaSezione);
    setScelte({});
    setTesti({});
  }

  function toggleScelta(campoKey: string, value: string) {
    setScelte((prev) => ({
      ...prev,
      [campoKey]: prev[campoKey] === value ? '' : value, // click di nuovo = deseleziona
    }));
  }

  async function submit() {
    const selezioni: { tipo: string; valore: string | null }[] = [];

    for (const campo of sezione.campi) {
      if (campo.tipo === 'scelta') {
        const scelto = scelte[campo.key];
        if (scelto) selezioni.push({ tipo: scelto, valore: null });
      } else {
        const testo = (testi[campo.key] ?? '').trim();
        if (testo) selezioni.push({ tipo: campo.key, valore: testo });
      }
    }

    if (selezioni.length === 0 && !nota.trim()) {
      toast.error('Seleziona almeno una modifica da segnalare');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('contributi')
      .insert({
        tipo: 'segnalazione_saletta',
        dati: {
          saletta_id: salettaId,
          sezione: sezioneId,
          selezioni,
          nota: nota.trim() || null,
        },
        stato: 'pending',
        device_id: getDeviceId(),
      });

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error(messaggioErroreInvio(error));
      return;
    }

    toast.success('Segnalazione inviata, grazie!');
    onClose();
  }

  return createPortal(

    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        ref={panelRef}
        style={dragStyle}
        className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[80dvh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER FISSO */}
        <div onTouchStart={handleDragStart} className="flex-shrink-0 cursor-grab active:cursor-grabbing border-b border-gray-100">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-trenord-green" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Modifica informazioni saletta</h2>
                <p className="text-xs text-gray-400">Segnala uno o più aggiornamenti insieme</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* BODY SCROLLABILE */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* SEZIONE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Sezione della località</label>
            <select
              value={sezioneId}
              onChange={(e) => cambiaSezione(e.target.value)}
              className="border border-gray-200 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
            >
              {Object.entries(SEZIONI).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* CAMPI DELLA SEZIONE — l'utente può compilarne quanti vuole */}
          {sezione.campi.map((campo) => (
            <div key={campo.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{campo.label}</label>

              {campo.tipo === 'scelta' ? (
                <div className="flex gap-2 flex-wrap">
                  {campo.opzioni.map((opz) => {
                    const selezionato = scelte[campo.key] === opz.value;
                    return (
                      <button
                        key={opz.value}
                        type="button"
                        onClick={() => toggleScelta(campo.key, opz.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          selezionato
                            ? 'bg-trenord-green text-white border-trenord-green'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opz.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={testi[campo.key] ?? ''}
                  onChange={(e) => setTesti((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                  placeholder={campo.placeholder ?? 'Inserisci informazione'}
                  className="border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
                />
              )}
            </div>
          ))}

          {/* NOTE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Note aggiuntive</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Informazioni opzionali"
              className="border border-gray-200 rounded-2xl px-4 py-3 text-base min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-trenord-green/30 focus:border-trenord-green"
            />
          </div>

          <div className="h-4" />
        </div>

        {/* FOOTER FISSO */}
        <div className="flex-shrink-0 px-5 pt-4 border-t border-gray-100 bg-white flex gap-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-[2] bg-trenord-green hover:opacity-90 transition-opacity text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Invio...' : 'Invia segnalazione'}
          </button>
        </div>

      </div>

    </div>,
    document.body
  );
}
