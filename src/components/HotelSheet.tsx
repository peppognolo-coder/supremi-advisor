import { useEffect, useRef, useState } from 'react';

import {
  MapPin, Phone,
  Clock, Star, X, AlertTriangle, CheckCircle,
  QrCode, KeyRound, Eye, EyeOff, Smartphone, Upload, Calendar,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';
import { useScrollLock } from '../lib/useScrollLock';
import { useSwipeDown } from '../lib/useSwipeDown';
import type { AttivitaRow, HotelDatiExtra } from '../lib/adminApi';
import { TIPI_PROBLEMA_HOTEL } from '../lib/adminApi'; // FIX P3: import da adminApi, rimossa dichiarazione locale

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
// MODAL SEGNALAZIONE
// =========================

function SegnalaProblemaHotelModal({
  attivitaId,
  onClose,
}: {
  attivitaId: string;
  onClose: () => void;
}) {
  const [tipo, setTipo]       = useState('');
  const [nota, setNota]       = useState('');
  const [loading, setLoading] = useState(false);

  // FIX P3: TIPI_PROBLEMA_HOTEL ora viene dall'import — nessuna dichiarazione locale

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

const CODICE_TTL_SEC = 5 * 60;

export default function HotelSheet({ hotel, onClose }: Props) {
  useScrollLock();
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });

  const [stats, setStats]             = useState<VerificaStats | null>(null);
  const [showSegnala, setShowSegnala] = useState(false);
  const [myRating, setMyRating]       = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Stato modal QR check-in
  const [showQrModal, setShowQrModal]       = useState(false);
  const [qrToken, setQrToken]               = useState('');
  const [qrTokenError, setQrTokenError]     = useState('');
  const [qrVisibile, setQrVisibile]         = useState(false);
  const [qrLoading, setQrLoading]           = useState(false);
  const [secondiRimasti, setSecondiRimasti] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stato form segnalazione nuovo QR
  const [showNuovoQr, setShowNuovoQr]       = useState(false);
  const [nuovoQrFile, setNuovoQrFile]       = useState<File | null>(null);
  const [nuovoQrPreview, setNuovoQrPreview] = useState<string | null>(null);
  const [nuovoQrScadenza, setNuovoQrScadenza] = useState('');
  const [nuovoQrLoading, setNuovoQrLoading] = useState(false);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function avviaCountdown() {
    setSecondiRimasti(CODICE_TTL_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondiRimasti((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setQrVisibile(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function formatCountdown(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function apriQrModal() {
    setShowQrModal(true);
    setQrToken('');
    setQrTokenError('');
    setQrVisibile(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondiRimasti(0);
  }

  async function verificaTokenQr() {
    if (!/^\d{6}$/.test(qrToken)) {
      setQrTokenError("Inserisci il codice a 6 cifre dall'app Authenticator.");
      return;
    }
    setQrLoading(true);
    setQrTokenError('');
    try {
      const res = await fetch('/.netlify/functions/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: qrToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setQrTokenError(data.error ?? 'Codice non valido o scaduto.');
        return;
      }
      setQrVisibile(true);
      avviaCountdown();
    } catch {
      setQrTokenError('Errore di rete. Verifica la connessione.');
    } finally {
      setQrLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato non supportato. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande. Massimo 5MB.');
      return;
    }
    setNuovoQrFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNuovoQrPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function inviaQrContributo() {
    if (!nuovoQrFile || !nuovoQrPreview) {
      toast.error('Seleziona un\'immagine del nuovo QR.');
      return;
    }
    setNuovoQrLoading(true);
    try {
      const { error } = await supabase.from('contributi').insert({
        tipo: 'hotel_qr',
        stato: 'pending',
        dati: {
          attivita_id: hotel.id,
          hotel_nome:  hotel.nome,
          imageBase64: nuovoQrPreview,
          mimeType:    nuovoQrFile.type,
          scadenza:    nuovoQrScadenza || null,
        },
      });
      if (error) throw error;
      toast.success('QR inviato per approvazione. Grazie!');
      setShowNuovoQr(false);
      setNuovoQrFile(null);
      setNuovoQrPreview(null);
      setNuovoQrScadenza('');
    } catch {
      toast.error('Errore invio. Riprova.');
    } finally {
      setNuovoQrLoading(false);
    }
  }

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

            {/* QR CHECK-IN */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                QR Check-in
              </p>

              {hotel.qr_checkin_url ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                  {/* Data scadenza */}
                  {hotel.qr_scadenza && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Valido fino al{' '}
                        <span className={`font-semibold ${
                          new Date(hotel.qr_scadenza) < new Date()
                            ? 'text-red-600'
                            : new Date(hotel.qr_scadenza) < new Date(Date.now() + 7 * 86400000)
                            ? 'text-amber-600'
                            : 'text-gray-700'
                        }`}>
                          {new Date(hotel.qr_scadenza).toLocaleDateString('it-IT', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* QR visibile dopo verifica TOTP */}
                  {qrVisibile ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                        <span className="text-xs text-gray-500">Si nasconde tra</span>
                        <span className={`font-mono font-bold text-sm ${secondiRimasti <= 60 ? 'text-red-600' : 'text-gray-800'}`}>
                          {formatCountdown(secondiRimasti)}
                        </span>
                      </div>
                      <img
                        src={hotel.qr_checkin_url}
                        alt="QR Check-in"
                        className="w-full rounded-xl border border-gray-200"
                      />
                      <p className="text-xs text-gray-400 text-center">
                        Mostra questo QR alla reception al momento del check-in.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={apriQrModal}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:opacity-90"
                    >
                      <QrCode className="w-4 h-4" />
                      Visualizza QR check-in
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 text-center">
                  <QrCode className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">QR check-in non ancora disponibile.</p>
                  <p className="text-xs text-gray-400 mt-1">Puoi caricarlo usando il bottone qui sotto.</p>
                </div>
              )}

              {/* Bottone segnala nuovo QR */}
              <button
                type="button"
                onClick={() => setShowNuovoQr(!showNuovoQr)}
                className="flex items-center gap-2 text-sm text-trenord-green font-medium self-start"
              >
                <Upload className="w-4 h-4" />
                {hotel.qr_checkin_url ? 'Carica QR aggiornato' : 'Carica il QR'}
              </button>

              {/* Form upload nuovo QR */}
              {showNuovoQr && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-gray-800">Carica il nuovo QR check-in</p>

                  {/* Upload file */}
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-trenord-green transition-colors">
                    {nuovoQrPreview ? (
                      <img src={nuovoQrPreview} alt="Preview QR" className="w-40 rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-300" />
                        <span className="text-sm text-gray-500">Tocca per selezionare l'immagine</span>
                        <span className="text-xs text-gray-400">JPG, PNG, WebP — max 5MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  {/* Data scadenza */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">
                      Data di scadenza (opzionale)
                    </label>
                    <input
                      type="date"
                      value={nuovoQrScadenza}
                      onChange={(e) => setNuovoQrScadenza(e.target.value)}
                      className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={inviaQrContributo}
                    disabled={nuovoQrLoading || !nuovoQrPreview}
                    className="py-3 rounded-xl bg-trenord-green text-white font-medium text-sm hover:opacity-90 disabled:opacity-40"
                  >
                    {nuovoQrLoading ? 'Invio in corso...' : 'Invia per approvazione'}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    Il QR verrà verificato dall'amministratore prima di essere pubblicato.
                  </p>
                </div>
              )}
            </div>

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

      {/* MODAL TOTP — visualizza QR check-in */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col gap-5 p-6 max-h-[80vh] overflow-y-auto">

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">QR Check-in</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Inserisci il codice dall'Authenticator</p>
                </div>
              </div>
              <button onClick={() => setShowQrModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-sm text-blue-800">
                  Apri la tua <strong>app di autenticazione</strong> e inserisci il codice a 6 cifre di Supremi Advisor.
                </p>
                <a href="https://apps.apple.com/it/app/google-authenticator/id388497605"
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-700 font-medium underline">
                  🍎 App Store (iOS)
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-700 font-medium underline">
                  🤖 Play Store (Android)
                </a>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase">
                Codice Authenticator
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={qrToken}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setQrToken(v);
                  setQrTokenError('');
                }}
                placeholder="000000"
                className={`mt-1 border rounded-xl px-4 py-3 w-full text-2xl font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${
                  qrTokenError ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {qrTokenError && (
                <p className="text-xs text-red-600 mt-1.5">{qrTokenError}</p>
              )}
            </div>

            <button
              onClick={verificaTokenQr}
              disabled={qrLoading || qrToken.length !== 6}
              className="bg-gray-900 text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {qrLoading ? 'Verifica in corso...' : 'Visualizza QR'}
            </button>

          </div>
        </div>
      )}
    </>
  );
}
