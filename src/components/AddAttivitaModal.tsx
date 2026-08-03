import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../lib/useScrollLock';
import { X, Store, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { messaggioErroreInvio } from '../lib/rateLimitError';
import { useSwipeDown } from '../lib/useSwipeDown';
import { CATEGORIE_ATTIVITA, DISTANZE_ATTIVITA, CATEGORIE_ALIMENTARI, addAttivita, uploadQrHotel } from '../lib/adminApi';
import type { HotelDatiExtra } from '../lib/adminApi';
import HotelFieldsSection from './forms/HotelFieldsSection';
import QrCheckinUpload, { type QrCheckinData } from './forms/QrCheckinUpload';
import OpzioniAlimentariSection from './forms/OpzioniAlimentariSection';

interface Props {
  stazioneId: string;
  onClose: () => void;
  onSuccess?: () => void;
  /** true quando aperto dal pannello admin: insert diretto, nessuna coda contributi. */
  direct?: boolean;
  /** obbligatorio quando direct=true. */
  adminPin?: string;
}

interface FasciaOraria {
  giorni: string[];
  apertura: string;
  chiusura: string;
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

export default function AddAttivitaModal({ stazioneId, onClose, onSuccess, direct = false, adminPin }: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });
  useScrollLock();

  const [loading, setLoading]       = useState(false);
  const [nome, setNome]             = useState('');
  const [categoria, setCategoria]   = useState('');
  const [indirizzo, setIndirizzo]   = useState('');
  const [ubicazione, setUbicazione] = useState('');
  const [distanzaPiedi, setDistanzaPiedi] = useState('');
  const [note, setNote]             = useState('');
  const [convenzionato, setConvenzionato] = useState(false);
  const [mapsQuery, setMapsQuery]   = useState('');
  const [fasceOrarie, setFasceOrarie] = useState<FasciaOraria[]>([]);

  // Campi specifici hotel
  const [hotelDati, setHotelDati] = useState<HotelDatiExtra>({
    telefono: '',
    reception_h24: false,
    colazione: false,
    wifi: false,
    navetta: false,
    ristorante: false,
    note_equipaggi: '',
  });

  const isHotel = categoria === 'Hotel';
  const isAlimentare = CATEGORIE_ALIMENTARI.includes(categoria);
  const [qrData, setQrData] = useState<QrCheckinData | null>(null);
  const [opzioniAlimentari, setOpzioniAlimentari] = useState<string[]>([]);

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

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit() {
    if (!nome.trim())     { toast.error('Inserisci il nome'); return; }
    if (!categoria)       { toast.error('Seleziona la categoria'); return; }

    setLoading(true);

    const payload = {
      stazione_id:    stazioneId,
      nome:           nome.trim(),
      categoria,
      indirizzo:      indirizzo.trim() || null,
      ubicazione:     ubicazione.trim() || null,
      distanza_piedi: distanzaPiedi || null,
      note:           note.trim() || null,
      convenzionato,
      maps_query:     mapsQuery.trim() || null,
      fasce_orarie:   fasceOrarie,
      dati_extra:     isHotel ? {
        ...hotelDati,
        telefono:        hotelDati.telefono?.trim() || null,
        note_equipaggi:  hotelDati.note_equipaggi?.trim() || null,
      } : isAlimentare && opzioniAlimentari.length > 0 ? {
        opzioni_alimentari: opzioniAlimentari,
      } : null,
      // QR check-in facoltativo — solo se l'utente ha caricato un'immagine.
      // In modalità contributo finisce in coda con l'attività; in modalità
      // diretta va caricato subito dopo l'insert (vedi sotto), perché
      // l'attività esiste già e non passa da nessuna revisione.
      ...(isHotel && qrData && !direct ? { qr_checkin_new: qrData } : {}),
    };

    let ok = true;
    let errorMsg: string | null = null;

    if (direct && adminPin) {
      const res = await addAttivita(adminPin, payload);
      ok = res.ok;
      errorMsg = res.error?.message ?? null;

      // QR facoltativo e non bloccante: se l'upload fallisce l'attività
      // resta comunque creata, si può ricaricare il QR in seguito da Attività.
      if (ok && res.data?.id && isHotel && qrData) {
        const uploadRes = await uploadQrHotel(
          adminPin, res.data.id, qrData.imageBase64, qrData.mimeType, qrData.scadenza ?? undefined
        );
        if (!uploadRes.ok) {
          toast.error('Attività creata, ma il QR non è stato caricato. Puoi ricaricarlo da Attività.');
        }
      }
    } else {
      const { error } = await supabase.from('contributi').insert({
        tipo:  'attivita',
        dati:  payload,
        stato: 'pending',
        device_id: getDeviceId(),
      });
      ok = !error;
      errorMsg = error ? messaggioErroreInvio(error) : null;
    }

    setLoading(false);
    if (!ok) { toast.error(errorMsg ?? 'Errore durante l\'invio'); return; }
    toast.success(direct ? 'Attività aggiunta' : 'Proposta inviata! Verrà revisionata dall\'admin.');
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

      {/* PANNELLO — flex-col, overflow-hidden */}
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
                <Store className="w-5 h-5 text-trenord-green" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Aggiungi attività</h2>
                <p className="text-xs text-gray-400">
                  {direct ? 'Verrà pubblicata subito' : "La proposta verrà revisionata dall'admin"}
                </p>
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
              placeholder="es.  Caffè Napoli"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          {/* CATEGORIA */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoria attività *</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="">Seleziona categoria</option>
              {CATEGORIE_ATTIVITA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* CAMPI HOTEL + QR CHECK-IN (solo se categoria = Hotel) */}
          {isHotel && (
            <>
              <HotelFieldsSection value={hotelDati} onChange={setHotelDati} />
              <Switch label="Convenzionato Trenord" value={convenzionato} onChange={setConvenzionato} />
              <QrCheckinUpload onChange={setQrData} />
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
              placeholder="Via Roma 1, Milano"
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
              placeholder="es. Di fronte all'uscita nord"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

         {/* MAPS QUERY */}
<div className="flex flex-col gap-1">
  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
    Google Maps
  </label>

  <input
    value={mapsQuery}
    onChange={(e) => setMapsQuery(e.target.value)}
    placeholder="es. Bar Napoli Milano Centrale"
    className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
  />

  <p className="text-xs text-gray-500 mt-1">
    Inserisci il nome dell'attività come compare su Google Maps.
  </p>
</div>

          {/* NOTE (solo per non-hotel — hotel usa note_equipaggi) */}
          {!isHotel && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                rows={2} placeholder="Informazioni aggiuntive..."
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
                    {fasceOrarie.length > 1 && (
                      <button type="button" onClick={() => removeFascia(idx)}
                        className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                    )}
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

          {/* Spacer per il footer fisso */}
          <div className="h-4" />
        </div>

        {/* FOOTER FISSO CON PULSANTE */}
        <div className="flex-shrink-0 px-5 pt-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-base hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
            Annulla
          </button>
          <button type="button" onClick={submit} disabled={loading || !nome.trim() || !categoria}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-trenord-green text-white font-medium text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Invio...' : direct ? 'Aggiungi attività' : 'Invia proposta'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
