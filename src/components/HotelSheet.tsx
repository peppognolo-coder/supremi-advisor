import { useEffect, useRef, useState } from 'react';

import {
  MapPin, Phone, Wifi, Coffee, Bus, Utensils,
  Clock, ShieldCheck, Star, X, AlertTriangle, CheckCircle,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';
import { useScrollLock } from '../lib/useScrollLock';
import { useSwipeDown } from '../lib/useSwipeDown';
import type { AttivitaRow, HotelDatiExtra } from '../lib/adminApi';

// =========================
// TIPI
// =========================

interface Props {
  hotel: AttivitaRow;
  onClose: () => void;
}

interface VerificaStats {
  totaleConferme: number;
  totaleProblemi: number;
  ratingMedio: number | null;
  numVoti: number;
}

// =========================
// HELPER BADGE
// =========================

const BADGE_CONFIG: {
  key: keyof HotelDatiExtra;
  emoji: string;
  label: string;
}[] = [
  { key: 'reception_h24', emoji: '🕐', label: 'Reception H24' },
  { key: 'navetta',       emoji: '🚌', label: 'Navetta disponibile' },
  { key: 'colazione',     emoji: '☕', label: 'Colazione inclusa' },
  { key: 'wifi',          emoji: '📶', label: 'WiFi disponibile' },
  { key: 'ristorante',    emoji: '🍽️', label: 'Ristorante interno' },
];

// =========================
// TIPI PROBLEMA HOTEL
// =========================

const TIPI_PROBLEMA_HOTEL = [
  'Pulizia insufficiente',
  'Camere rumorose',
  'Colazione scarsa',
  'Personale poco disponibile',
  'WiFi non funzionante',
  'Climatizzazione guasta',
  'Problemi nella camera',
  'Struttura deteriorata',
  'Navetta non disponibile',
  'Servizio navetta inaffidabile',
  'Informazioni non aggiornate',
  'Altro',
];

// =========================
// MODAL SEGNALAZIONE
// =========================

function SegnalaProblemaHotelModal({
  attivitaId,
  onClose,
}: {
  attivitaId: string;
  onClose: () => void;
}) {
  const [tipo, setTipo]     = useState('');
  const [nota, setNota]     = useState('');
  const [loading, setLoading] = useState(false);
  const deviceId = useRef(localStorage.getItem('supremi_device_id') ?? (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('supremi_device_id', id);
    return id;
  })());

  async function submit() {
    if (!tipo) { toast.error('Seleziona il tipo di problema'); return; }
    setLoading(true);
    const { error } = await supabase.from('attivita_verifiche').insert({
      attivita_id:   attivitaId,
      is_correct:    false,
      device_id:     deviceId.current,
      tipo_problema: tipo,
      nota:          nota.trim() || null,
    });
    setLoading(false);
    if (error) { toast.error('Errore invio segnalazione'); return; }
    toast.success('Segnalazione inviata. Grazie!');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-end justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex-shrink-0 px-5 pt-3 pb-4 border-b border-gray-100">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Segnala problema</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-3">
          {TIPI_PROBLEMA_HOTEL.map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`text-left px-4 py-3 rounded-xl border text-base font-medium transition-colors ${
                tipo === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
              }`}>
              {t}
            </button>
          ))}
          <textarea value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Note aggiuntive (opzionale)" rows={2}
            className="border border-gray-200 rounded-xl px-3 py-2 text-base resize-none mt-1" />
          <button type="button" onClick={submit} disabled={loading || !tipo}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium text-base disabled:opacity-50">
            {loading ? 'Invio...' : 'Invia segnalazione'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// COMPONENTE PRINCIPALE
// =========================

export default function HotelSheet({ hotel, onClose }: Props) {
  useScrollLock();
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });

  const [stats, setStats]           = useState<VerificaStats | null>(null);
  const [showSegnala, setShowSegnala] = useState(false);
  const [myRating, setMyRating]     = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const dati = (hotel.dati_extra ?? {}) as HotelDatiExtra;
  const isConvenzionato = hotel.convenzionato;

  const deviceId = useRef(localStorage.getItem('supremi_device_id') ?? (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('supremi_device_id', id);
    return id;
  })());

  // ── Carica statistiche verifiche e rating ────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: verifiche }, { data: voti }, { data: mioVoto }] = await Promise.all([
        supabase.from('attivita_verifiche')
          .select('is_correct')
          .eq('attivita_id', hotel.id),
        supabase.from('attivita_valutazioni')
          .select('voto')
          .eq('attivita_id', hotel.id),
        supabase.from('attivita_valutazioni')
          .select('voto')
          .eq('attivita_id', hotel.id)
          .eq('device_id', deviceId.current)
          .maybeSingle(),
      ]);

      const conf    = (verifiche ?? []).filter((v) => v.is_correct).length;
      const prob    = (verifiche ?? []).filter((v) => !v.is_correct).length;
      const allVoti = (voti ?? []).map((v) => v.voto);
      const media   = allVoti.length > 0
        ? Math.round((allVoti.reduce((s, v) => s + v, 0) / allVoti.length) * 10) / 10
        : null;

      setStats({ totaleConferme: conf, totaleProblemi: prob, ratingMedio: media, numVoti: allVoti.length });
      if (mioVoto) setMyRating(mioVoto.voto);
    }
    load();
  }, [hotel.id]);

  // ── Rating ───────────────────────────────────────────────────────────────
  async function submitRating(voto: number) {
    setSubmittingRating(true);
    await supabase.from('attivita_valutazioni').upsert(
      { attivita_id: hotel.id, device_id: deviceId.current, voto },
      { onConflict: 'attivita_id,device_id' }
    );
    setMyRating(voto);
    setStats((prev) => prev ? { ...prev, ratingMedio: voto, numVoti: prev.numVoti + (myRating ? 0 : 1) } : prev);
    setSubmittingRating(false);
    toast.success('Valutazione salvata');
  }

  // ── Conferma informazioni corrette ───────────────────────────────────────
  async function confermaCorretto() {
    const { error } = await supabase.from('attivita_verifiche').insert({
      attivita_id:   hotel.id,
      is_correct:    true,
      device_id:     deviceId.current,
      tipo_problema: null,
      nota:          null,
    });
    if (error) { toast.error('Errore'); return; }
    toast.success('Grazie per la conferma!');
    setStats((prev) => prev ? { ...prev, totaleConferme: prev.totaleConferme + 1 } : prev);
  }

  // ── Navigazione Maps ─────────────────────────────────────────────────────
  function naviga() {
    const q = hotel.maps_query ?? hotel.indirizzo ?? hotel.nome;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  }

  const activeBadges = BADGE_CONFIG.filter((b) => dati[b.key]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end" onClick={onClose}>
        <div
          ref={panelRef}
          style={dragStyle}
          className="bg-white w-full rounded-t-3xl flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── DRAG HANDLE + HEADER ── */}
          <div onTouchStart={handleDragStart} className="flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{hotel.nome}</h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">🏨 Hotel</span>
                  {hotel.distanza_piedi && (
                    <span className="text-xs text-gray-400">· 🚶 {hotel.distanza_piedi}</span>
                  )}
                  {isConvenzionato && (
                    <span className="text-xs font-semibold text-trenord-green">🚆 Convenzionato Trenord</span>
                  )}
                </div>
              </div>
              <button onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── BODY SCROLLABILE ── */}
          <div className="overflow-y-auto flex-1 px-5 pb-8 pt-4 flex flex-col gap-5">

            {/* BADGE RAPIDI */}
            {activeBadges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeBadges.map((b) => (
                  <span key={b.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700">
                    {b.emoji} {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* RATING */}
            {stats && (
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-gray-900 text-lg">
                      {stats.ratingMedio !== null ? stats.ratingMedio.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-gray-400">({stats.numVoti} voti)</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {stats.totaleConferme} conferme · {stats.totaleProblemi} problemi
                  </span>
                </div>
                {/* Stelle interattive */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" onClick={() => !submittingRating && submitRating(v)}
                      disabled={submittingRating}
                      className={`text-2xl transition-transform active:scale-125 ${v <= (myRating ?? 0) ? 'opacity-100' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                {myRating && (
                  <p className="text-xs text-emerald-600">Hai valutato: {myRating} stelle</p>
                )}
              </div>
            )}

            {/* INFORMAZIONI CONTATTO */}
            <div className="flex flex-col gap-3">
              {dati.telefono && (
                <a href={`tel:${dati.telefono}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-blue-300 transition-colors">
                  <Phone className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Telefono</p>
                    <p className="text-sm font-medium text-blue-600">{dati.telefono}</p>
                  </div>
                </a>
              )}

              {hotel.indirizzo && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Indirizzo</p>
                    <p className="text-sm text-gray-700">{hotel.indirizzo}</p>
                  </div>
                </div>
              )}

              {hotel.distanza_piedi && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Distanza dalla stazione</p>
                    <p className="text-sm text-gray-700">{hotel.distanza_piedi}</p>
                  </div>
                </div>
              )}
            </div>

            {/* NOTE EQUIPAGGI */}
            {dati.note_equipaggi && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                  📋 Note per il personale
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">{dati.note_equipaggi}</p>
              </div>
            )}

            {/* NOTE GENERALI */}
            {hotel.note && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-1">Note</p>
                <p className="text-sm text-gray-700">{hotel.note}</p>
              </div>
            )}

            {/* PULSANTE NAVIGA */}
            {(hotel.maps_query || hotel.indirizzo) && (
              <button type="button" onClick={naviga}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium text-base hover:opacity-90">
                <MapPin className="w-5 h-5" />
                Naviga con Maps
              </button>
            )}

            {/* VERIFICA INFORMAZIONI */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Verifica delle informazioni
              </p>
              <p className="text-sm text-gray-600">Hai soggiornato in questo hotel?</p>
              <div className="flex gap-2">
                <button type="button" onClick={confermaCorretto}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90">
                  <CheckCircle className="w-4 h-4" />
                  Dati corretti
                </button>
                <button type="button" onClick={() => setShowSegnala(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium hover:bg-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                  Segnala problema
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showSegnala && (
        <SegnalaProblemaHotelModal
          attivitaId={hotel.id}
          onClose={() => setShowSegnala(false)}
        />
      )}
    </>
  );
}