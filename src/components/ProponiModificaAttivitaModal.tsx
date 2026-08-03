import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../lib/useScrollLock';
import { X, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { messaggioErroreInvio } from '../lib/rateLimitError';
import { useSwipeDown } from '../lib/useSwipeDown';
import {
  CATEGORIE_ATTIVITA,
  DISTANZE_ATTIVITA,
  CATEGORIE_ALIMENTARI,
  type AttivitaRow,
  type FasciaOraria,
  type HotelDatiExtra,
} from '../lib/adminApi';
import HotelFieldsSection from './forms/HotelFieldsSection';
import OpzioniAlimentariSection from './forms/OpzioniAlimentariSection';

interface Props {
  attivita: AttivitaRow;
  onClose: () => void;
  onSuccess?: () => void;
}

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        value ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
      }`}>
      <span className="text-base font-medium">{label}</span>
      <span className="text-sm">{value ? 'SÌ' : 'NO'}</span>
    </button>
  );
}

/**
 * Propone una modifica a un'attività esistente. A differenza di
 * AddAttivitaModal (nuova attività), qui il form parte precompilato con i
 * valori attuali e al submit calcola il DIFF — solo i campi realmente
 * cambiati vengono inclusi nel contributo, come { prima, dopo }.
 * Niente QR check-in qui: ha già il suo percorso dedicato (upload diretto
 * dalla scheda hotel con verifica TOTP) — mescolarlo qui creerebbe due vie
 * per la stessa cosa.
 */
export default function ProponiModificaAttivitaModal({ attivita, onClose, onSuccess }: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });
  useScrollLock();

  const [loading, setLoading] = useState(false);

  const [nome, setNome]             = useState(attivita.nome ?? '');
  const [categoria, setCategoria]   = useState(attivita.categoria ?? '');
  const [indirizzo, setIndirizzo]   = useState(attivita.indirizzo ?? '');
  const [ubicazione, setUbicazione] = useState(attivita.ubicazione ?? '');
  const [distanzaPiedi, setDistanzaPiedi] = useState(attivita.distanza_piedi ?? '');
  const [note, setNote]             = useState(attivita.note ?? '');
  const [convenzionato, setConvenzionato] = useState(attivita.convenzionato ?? false);
  const [mapsQuery, setMapsQuery]   = useState(attivita.maps_query ?? '');
  const [fasceOrarie, setFasceOrarie] = useState<FasciaOraria[]>(attivita.fasce_orarie ?? []);
  const [notaUtente, setNotaUtente] = useState('');

  const [hotelDati, setHotelDati] = useState<HotelDatiExtra>({
    telefono: attivita.dati_extra?.telefono ?? '',
    reception_h24: attivita.dati_extra?.reception_h24 ?? false,
    colazione: attivita.dati_extra?.colazione ?? false,
    wifi: attivita.dati_extra?.wifi ?? false,
    navetta: attivita.dati_extra?.navetta ?? false,
    ristorante: attivita.dati_extra?.ristorante ?? false,
    note_equipaggi: attivita.dati_extra?.note_equipaggi ?? '',
  });
  const [opzioniAlimentari, setOpzioniAlimentari] = useState<string[]>(
    attivita.dati_extra?.opzioni_alimentari ?? []
  );

  const isHotel = categoria === 'Hotel';
  const isAlimentare = CATEGORIE_ALIMENTARI.includes(categoria);

  // ── Fasce orarie ─────────────────────────────────────────────────────────
  function addFascia() {
    setFasceOrarie((prev) => [...prev, { giorni: [], apertura: '', chiusura: '' }]);
  }
  function removeFascia(i: number) {
    setFasceOrarie((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateFascia(i: number, field: string, value: unknown) {
    setFasceOrarie((prev) => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }
  function toggleGiorno(fasciaIdx: number, giorno: string) {
    setFasceOrarie((prev) => prev.map((f, idx) => {
      if (idx !== fasciaIdx) return f;
      const giorni = f.giorni.includes(giorno)
        ? f.giorni.filter((g) => g !== giorno)
        : [...f.giorni, giorno];
      return { ...f, giorni };
    }));
  }

  // ── Submit: calcola il diff, invia solo i campi cambiati ───────────────────
  async function submit() {
    if (!nome.trim())   { toast.error('Il nome non può essere vuoto'); return; }
    if (!categoria)     { toast.error('Seleziona la categoria'); return; }

    const datiExtraNuovo = isHotel ? {
      ...hotelDati,
      telefono: hotelDati.telefono?.trim() || null,
      note_equipaggi: hotelDati.note_equipaggi?.trim() || null,
    } : isAlimentare && opzioniAlimentari.length > 0 ? {
      opzioni_alimentari: opzioniAlimentari,
    } : null;

    const candidati: Record<string, { prima: unknown; dopo: unknown }> = {
      nome:           { prima: attivita.nome,            dopo: nome.trim() },
      categoria:      { prima: attivita.categoria,        dopo: categoria },
      indirizzo:      { prima: attivita.indirizzo,        dopo: indirizzo.trim() || null },
      ubicazione:     { prima: attivita.ubicazione,       dopo: ubicazione.trim() || null },
      distanza_piedi: { prima: attivita.distanza_piedi,   dopo: distanzaPiedi || null },
      note:           { prima: attivita.note,             dopo: note.trim() || null },
      convenzionato:  { prima: attivita.convenzionato,    dopo: convenzionato },
      maps_query:     { prima: attivita.maps_query,       dopo: mapsQuery.trim() || null },
      fasce_orarie:   { prima: attivita.fasce_orarie ?? [], dopo: fasceOrarie },
      dati_extra:     { prima: attivita.dati_extra ?? null, dopo: datiExtraNuovo },
    };

    // Solo i campi il cui valore è realmente cambiato entrano nel contributo.
    const modifiche: Record<string, { prima: unknown; dopo: unknown }> = {};
    for (const [campo, { prima, dopo }] of Object.entries(candidati)) {
      if (JSON.stringify(prima) !== JSON.stringify(dopo)) {
        modifiche[campo] = { prima, dopo };
      }
    }

    if (Object.keys(modifiche).length === 0) {
      toast.error('Non hai modificato nulla');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('contributi').insert({
      tipo: 'modifica_attivita',
      dati: {
        attivita_id: attivita.id,
        nome_attivita: attivita.nome,
        modifiche,
        nota_utente: notaUtente.trim() || null,
      },
      stato: 'pending',
      device_id: getDeviceId(),
    });

    setLoading(false);
    if (error) { toast.error(messaggioErroreInvio(error)); return; }
    toast.success('Proposta inviata! Verrà revisionata da un admin.');
    onSuccess?.();
    onClose();
  }

  return createPortal(
   <div
  className="
    fixed inset-0 z-[9999]
    bg-black/40
    flex
    items-end
    md:items-center
    justify-center
    p-0 md:p-4
  "
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        ref={panelRef}
        style={dragStyle}
        className="bg-white dark:bg-gray-900 w-full md:max-w-2xl lg:max-w-3xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[80dvh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >

        {/* DRAG HANDLE + HEADER FISSO */}
        <div onTouchStart={handleDragStart}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing border-b border-gray-100 dark:border-gray-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-trenord-green" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Proponi modifica</h2>
                <p className="text-xs text-gray-400">La proposta verrà revisionata da un admin</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* BODY SCROLLABILE */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* NOME */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          {/* CATEGORIA */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoria attività *</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              {CATEGORIE_ATTIVITA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* CAMPI HOTEL (solo se categoria = Hotel) */}
          {isHotel && (
            <>
              <HotelFieldsSection value={hotelDati} onChange={setHotelDati} />
              <Switch label="Convenzionato Trenord" value={convenzionato} onChange={setConvenzionato} />
            </>
          )}

          {/* OPZIONI ALIMENTARI (solo per categorie alimentari) */}
          {isAlimentare && (
            <OpzioniAlimentariSection value={opzioniAlimentari} onChange={setOpzioniAlimentari} />
          )}

          {/* CONVENZIONATO (solo per non-hotel) */}
          {!isHotel && (
            <Switch label="Convenzionato Trenord" value={convenzionato} onChange={setConvenzionato} />
          )}

          {/* INDIRIZZO */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Indirizzo</label>
            <input value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          {/* DISTANZA */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distanza dalla stazione</label>
            <select value={distanzaPiedi} onChange={(e) => setDistanzaPiedi(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="">Seleziona distanza</option>
              {DISTANZE_ATTIVITA.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* UBICAZIONE */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ubicazione</label>
            <input value={ubicazione} onChange={(e) => setUbicazione(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          {/* MAPS QUERY */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Google Maps</label>
            <input value={mapsQuery} onChange={(e) => setMapsQuery(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          {/* NOTE (solo per non-hotel — hotel usa note_equipaggi) */}
          {!isHotel && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none" />
            </div>
          )}

          {/* FASCE ORARIE (solo per non-hotel) */}
          {!isHotel && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fasce orarie</label>
                <button type="button" onClick={addFascia}
                  className="flex items-center gap-1 text-sm text-trenord-green font-medium">
                  <Plus className="w-4 h-4" /> Aggiungi
                </button>
              </div>
              {fasceOrarie.map((fascia, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fascia {idx + 1}</span>
                    <button type="button" onClick={() => removeFascia(idx)}
                      className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GIORNI.map((g) => (
                      <button key={g} type="button" onClick={() => toggleGiorno(idx, g)}
                        className={`rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                          fascia.giorni.includes(g) ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                        }`}>{g}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Apertura</label>
                      <input type="time" value={fascia.apertura}
                        onChange={(e) => updateFascia(idx, 'apertura', e.target.value)}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Chiusura</label>
                      <input type="time" value={fascia.chiusura}
                        onChange={(e) => updateFascia(idx, 'chiusura', e.target.value)}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NOTA PER L'ADMIN */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Perché proponi questa modifica? (facoltativo)
            </label>
            <textarea value={notaUtente} onChange={(e) => setNotaUtente(e.target.value)}
              rows={2} placeholder="es. sono passato oggi e chiude alle 21, non alle 20"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none" />
          </div>

          <div className="h-4" />
        </div>

        {/* FOOTER FISSO */}
        <div className="flex-shrink-0 px-5 pt-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-base hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
            Annulla
          </button>
          <button type="button" onClick={submit} disabled={loading || !nome.trim() || !categoria}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-trenord-green text-white font-medium text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Invio...' : 'Invia proposta'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
