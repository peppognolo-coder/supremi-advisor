import { useState } from 'react';
import { useScrollLock } from '../lib/useScrollLock';
import { X, Store, Hotel, Clock3, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useSwipeDown } from '../lib/useSwipeDown';
import { CATEGORIE_ATTIVITA, DISTANZE_ATTIVITA } from '../lib/adminApi';
import type { HotelDatiExtra } from '../lib/adminApi';

interface Props {
  stazioneId: string;
  onClose: () => void;
  onSuccess?: () => void;
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
        value ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white border-gray-200 text-gray-700'
      }`}>
      <span className="text-base font-medium">{label}</span>
      <span className="text-sm">{value ? 'SÌ' : 'NO'}</span>
    </button>
  );
}

export default function AddAttivitaModal({ stazioneId, onClose, onSuccess }: Props) {
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
      } : null,
    };

    const { error } = await supabase.from('contributi').insert({
      tipo:  'attivita',
      dati:  payload,
      stato: 'pending',
    });

    setLoading(false);
    if (error) { toast.error('Errore durante l\'invio'); return; }
    toast.success('Proposta inviata! Verrà revisionata dall\'admin.');
    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* PANNELLO — flex-col, overflow-hidden */}
      <div
        ref={panelRef}
        style={dragStyle}
        className="bg-white w-full rounded-t-3xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* DRAG HANDLE + HEADER FISSO */}
        <div onTouchStart={handleDragStart}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing border-b border-gray-100">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-trenord-green" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Aggiungi attività</h2>
                <p className="text-xs text-gray-400">La proposta verrà revisionata dall'admin</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
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
              placeholder="es. Hotel Milano Centrale"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base" />
          </div>

          {/* CATEGORIA */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoria attività *</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base">
              <option value="">Seleziona categoria</option>
              {CATEGORIE_ATTIVITA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* CAMPI HOTEL (solo se categoria = Hotel) */}
          {isHotel && (
            <div className="flex flex-col gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">🏨 Informazioni hotel</p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Telefono</label>
                <input value={hotelDati.telefono ?? ''} onChange={(e) => setHotelDati((p) => ({ ...p, telefono: e.target.value }))}
                  placeholder="+39 02 1234567" type="tel"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-base bg-white" />
              </div>

              <div className="flex flex-col gap-2">
                <Switch label="Reception H24" value={hotelDati.reception_h24 ?? false}
                  onChange={(v) => setHotelDati((p) => ({ ...p, reception_h24: v }))} />
                <Switch label="Colazione disponibile" value={hotelDati.colazione ?? false}
                  onChange={(v) => setHotelDati((p) => ({ ...p, colazione: v }))} />
                <Switch label="WiFi disponibile" value={hotelDati.wifi ?? false}
                  onChange={(v) => setHotelDati((p) => ({ ...p, wifi: v }))} />
                <Switch label="Navetta disponibile" value={hotelDati.navetta ?? false}
                  onChange={(v) => setHotelDati((p) => ({ ...p, navetta: v }))} />
                <Switch label="Ristorante interno" value={hotelDati.ristorante ?? false}
                  onChange={(v) => setHotelDati((p) => ({ ...p, ristorante: v }))} />
                <Switch label="Convenzionato Trenord" value={convenzionato}
                  onChange={setConvenzionato} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note equipaggi</label>
                <textarea value={hotelDati.note_equipaggi ?? ''}
                  onChange={(e) => setHotelDati((p) => ({ ...p, note_equipaggi: e.target.value }))}
                  rows={3} placeholder="es. colazione dalle 6:00, navetta ogni 30 min, check-in anticipato possibile..."
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-base resize-none bg-white" />
              </div>
            </div>
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
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base" />
          </div>

          {/* DISTANZA */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distanza dalla stazione</label>
            <select value={distanzaPiedi} onChange={(e) => setDistanzaPiedi(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base">
              <option value="">Seleziona distanza</option>
              {DISTANZE_ATTIVITA.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* UBICAZIONE */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ubicazione</label>
            <input value={ubicazione} onChange={(e) => setUbicazione(e.target.value)}
              placeholder="es. Di fronte all'uscita nord"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base" />
          </div>

          {/* MAPS QUERY */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Maps Query</label>
            <input value={mapsQuery} onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="es. Hotel Milano Centrale via Pisani"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base" />
          </div>

          {/* NOTE (solo per non-hotel — hotel usa note_equipaggi) */}
          {!isHotel && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                rows={2} placeholder="Informazioni aggiuntive..."
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-base resize-none" />
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
                <div key={idx} className="border border-gray-200 rounded-2xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Fascia {idx + 1}</span>
                    {fasceOrarie.length > 1 && (
                      <button type="button" onClick={() => removeFascia(idx)}
                        className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GIORNI.map((g) => (
                      <button key={g} type="button" onClick={() => toggleGiorno(idx, g)}
                        className={`rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                          fascia.giorni.includes(g) ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white text-gray-600 border-gray-200'
                        }`}>{g}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Apertura</label>
                      <input type="time" value={fascia.apertura}
                        onChange={(e) => updateFascia(idx, 'apertura', e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-base" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Chiusura</label>
                      <input type="time" value={fascia.chiusura}
                        onChange={(e) => updateFascia(idx, 'chiusura', e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-base" />
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
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white">
          <button type="button" onClick={submit} disabled={loading || !nome.trim() || !categoria}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-trenord-green text-white font-medium text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Invio...' : 'Invia proposta'}
          </button>
        </div>

      </div>
    </div>
  );
}
