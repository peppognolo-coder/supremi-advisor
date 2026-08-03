import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { type StazioneCompleta, addStazione } from '../lib/adminApi';

interface Props {
  adminPin: string;
  onClose: () => void;
  onAdded: (s: StazioneCompleta) => void;
}

export default function AddStazioneModal({ adminPin, onClose, onAdded }: Props) {
  const [loading, setLoading]     = useState(false);
  const [nome, setNome]           = useState('');
  const [codice, setCodice]       = useState('');
  const [regione, setRegione]     = useState('');
  const [provincia, setProvincia] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [mapsQuery, setMapsQuery] = useState('');
  const [plusCode, setPlusCode]   = useState('');
  const [lat, setLat]             = useState('');
  const [lng, setLng]             = useState('');
  const [note, setNote]           = useState('');

  async function submit() {
    if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return; }

    setLoading(true);
    const res = await addStazione(adminPin, {
      nome:       nome.trim(),
      codice:     codice.trim() || null,
      regione:    regione.trim() || null,
      provincia:  provincia.trim() || null,
      indirizzo:  indirizzo.trim() || null,
      maps_query: mapsQuery.trim() || null,
      plus_code:  plusCode.trim() || null,
      lat:        lat === '' ? null : Number(lat),
      lng:        lng === '' ? null : Number(lng),
      note:       note.trim() || null,
    });
    setLoading(false);

    if (!res.ok || !res.data) {
      toast.error(res.error?.message ?? "Errore durante l'aggiunta");
      return;
    }

    toast.success('Stazione aggiunta');
    onAdded(res.data);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 pb-24 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nuova stazione</h2>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* NOME */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Nome *</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="es. Milano Centrale"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            autoFocus
          />
        </div>

        {/* CODICE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Codice RFI</label>
          <input
            value={codice}
            onChange={(e) => setCodice(e.target.value)}
            placeholder="es. MCTL"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base font-mono"
          />
        </div>

        {/* REGIONE + PROVINCIA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase">Regione</label>
            <input
              value={regione}
              onChange={(e) => setRegione(e.target.value)}
              placeholder="es. Lombardia"
              className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase">Provincia</label>
            <input
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              placeholder="es. Milano"
              className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            />
          </div>
        </div>

        {/* INDIRIZZO */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Indirizzo</label>
          <input
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder="es. Piazza Duca d'Aosta 1, Milano"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base"
          />
        </div>

        {/* MAPS QUERY */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Maps Query</label>
          <input
            value={mapsQuery}
            onChange={(e) => setMapsQuery(e.target.value)}
            placeholder="es. Milano Centrale stazione ferroviaria"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base"
          />
        </div>

        {/* PLUS CODE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Plus Code</label>
          <input
            value={plusCode}
            onChange={(e) => setPlusCode(e.target.value)}
            placeholder="es. 8FQ9+WF"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base font-mono"
          />
        </div>

        {/* LAT + LNG */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase">Latitudine</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="45.484"
              className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase">Longitudine</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="9.204"
              className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            />
          </div>
        </div>

        {/* NOTE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Informazioni aggiuntive..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-base min-h-[100px]"
          />
        </div>

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? 'Aggiunta...' : 'Aggiungi stazione'}
        </button>

      </div>
    </div>
  );
}
