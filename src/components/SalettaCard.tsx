import { useState, useEffect, useRef } from 'react';

import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  MessageSquarePlus,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Smartphone,
} from 'lucide-react';

import type { Saletta } from '../lib/database.types';
import { formatTitle } from '../lib/format';
import SegnalazioneModal from './SegnalazioneModal';
import SalettaVerifica from './SalettaVerifica';
import SegnalaProblemaFisicoModal from './SegnalaProblemaFisicoModal';

// has_codice: campo calcolato dalla query (codice_accesso is not null).
// codice_accesso NON arriva mai nel payload — viene fornito solo dalla
// Netlify Function verify-totp + get-codice-saletta dopo verifica TOTP.
type SalettaConFlag = Saletta & { has_codice?: boolean };

// Durata visibilità codice dopo verifica: 5 minuti
const CODICE_TTL_SEC = 5 * 60;

interface Props {
  stazioneName?: string;
  salette?: SalettaConFlag[];
  initialExpanded?: boolean;
}

export default function SalettaCard({
  stazioneName,
  salette = [],
  initialExpanded = false,
}: Props) {

  const [expanded, setExpanded] = useState(initialExpanded);
  const [showModal, setShowModal] = useState(false);
  const [selectedSalettaId, setSelectedSalettaId] = useState<string | null>(null);
  const [showProblemaModal, setShowProblemaModal] = useState(false);
  const [problemaTargetSaletta, setProblemaTargetSaletta] = useState<{ id: string; nome: string } | null>(null);

  // Stato modal codice
  const [codiceModalSalettaId, setCodiceModalSalettaId] = useState<string | null>(null);
  const [token, setToken]                               = useState('');
  const [tokenError, setTokenError]                     = useState('');
  const [codiceVisibile, setCodiceVisibile]             = useState<string | null>(null);
  const [mostraCodice, setMostraCodice]                 = useState(false);
  const [codiceLoading, setCodiceLoading]               = useState(false);

  // Countdown 5 minuti
  const [secondiRimasti, setSecondiRimasti] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function avviaCountdown() {
    setSecondiRimasti(CODICE_TTL_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondiRimasti((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setCodiceVisibile(null);
          setMostraCodice(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Pulizia timer alla chiusura
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function apriModalCodice(salettaId: string) {
    setCodiceModalSalettaId(salettaId);
    setToken('');
    setTokenError('');
    setCodiceVisibile(null);
    setMostraCodice(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondiRimasti(0);
  }

  function chiudiModalCodice() {
    setCodiceModalSalettaId(null);
    setToken('');
    setTokenError('');
    setCodiceVisibile(null);
    setMostraCodice(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondiRimasti(0);
  }

  function formatCountdown(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function verificaToken() {
    if (!/^\d{6}$/.test(token)) {
      setTokenError('Inserisci il codice a 6 cifre dall\'app Authenticator.');
      return;
    }

    setCodiceLoading(true);
    setTokenError('');

    try {
      // 1. Verifica il token TOTP
      const verRes = await fetch('/.netlify/functions/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const verData = await verRes.json();

      if (!verRes.ok || !verData.ok) {
        setTokenError(verData.error ?? 'Codice non valido o scaduto.');
        return;
      }

      // 2. Token valido — richiedi il codice della saletta
      const codRes = await fetch('/.netlify/functions/get-codice-saletta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saletta_id: codiceModalSalettaId }),
      });

      const codData = await codRes.json();

      if (!codRes.ok) {
        setTokenError(codData.error ?? 'Errore nel recupero del codice.');
        return;
      }

      if (!codData.codice_accesso) {
        setTokenError('Codice non ancora disponibile per questa saletta.');
        return;
      }

      setCodiceVisibile(codData.codice_accesso);
      avviaCountdown();

    } catch {
      setTokenError('Errore di rete. Verifica la connessione.');
    } finally {
      setCodiceLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* HEADER */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {formatTitle(stazioneName)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {salette.length} servizi disponibili
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* CONTENUTO */}
        {expanded && (
          <div className="border-t border-gray-100 p-4 flex flex-col gap-4 bg-gray-50">
            {salette.map((saletta) => (
              <div
                key={saletta.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-4"
              >
                {/* TIPO */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {formatTitle(saletta.tipo)}
                    </h3>
                    {saletta.ubicazione && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{formatTitle(saletta.ubicazione)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DOTAZIONI */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${saletta.microonde ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    <Microwave className={`w-4 h-4 flex-shrink-0 ${saletta.microonde ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <span>Microonde</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${saletta.distributori ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    <Coffee className={`w-4 h-4 flex-shrink-0 ${saletta.distributori ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <span>Distributori</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${saletta.acqua ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    <Droplets className={`w-4 h-4 flex-shrink-0 ${saletta.acqua ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <span>Acqua</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${saletta.climatizzata ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    <Snowflake className={`w-4 h-4 flex-shrink-0 ${saletta.climatizzata ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <span>Climatizzata</span>
                  </div>
                </div>

                {/* NOTE */}
                {saletta.note && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600">
                    {formatTitle(saletta.note)}
                  </div>
                )}

                {/* BUTTONS */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Aggiorna questa saletta
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedSalettaId(saletta.id);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-trenord-green text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Modifica informazioni
                    </button>
                    <button
                      onClick={() => {
                        setProblemaTargetSaletta({
                          id: saletta.id,
                          nome: `${stazioneName ?? ''} — ${saletta.tipo ?? ''}`.trim(),
                        });
                        setShowProblemaModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Segnala guasto
                    </button>
                  </div>

                  {/* MOSTRA CODICE — solo se la saletta ha un codice nel DB */}
                  {(saletta as SalettaConFlag).has_codice && (
                    <button
                      onClick={() => apriModalCodice(saletta.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 text-white text-xs font-medium hover:opacity-90 transition-opacity self-start"
                    >
                      <KeyRound className="w-4 h-4" />
                      Mostra codice di accesso
                    </button>
                  )}
                </div>

                {/* VERIFICA RAPIDA */}
                <SalettaVerifica salettaId={saletta.id} />

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL SEGNALA MODIFICA */}
      {showModal && selectedSalettaId && (
        <SegnalazioneModal
          salettaId={selectedSalettaId}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* MODAL SEGNALA PROBLEMA FISICO */}
      {showProblemaModal && problemaTargetSaletta && (
        <SegnalaProblemaFisicoModal
          salettaId={problemaTargetSaletta.id}
          salettaNome={problemaTargetSaletta.nome}
          onClose={() => {
            setShowProblemaModal(false);
            setProblemaTargetSaletta(null);
          }}
        />
      )}

      {/* MODAL CODICE DI ACCESSO — verifica TOTP */}
      {codiceModalSalettaId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) chiudiModalCodice(); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col gap-5 p-6">

            {/* HEADER */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Codice di accesso</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Inserisci il codice dall'Authenticator</p>
                </div>
              </div>
              <button onClick={chiudiModalCodice}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* CODICE VISIBILE */}
            {codiceVisibile ? (
              <div className="flex flex-col gap-4">

                {/* COUNTDOWN */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                  <span className="text-xs text-gray-500">Il codice si nasconde tra</span>
                  <span className={`font-mono font-bold text-sm ${secondiRimasti <= 60 ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatCountdown(secondiRimasti)}
                  </span>
                </div>

                {/* CODICE */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Codice accesso</p>
                  <div className="bg-gray-900 rounded-2xl px-5 py-4 flex items-center justify-between">
                    <span className={`font-mono text-2xl font-bold tracking-widest text-white transition-all ${!mostraCodice ? 'blur-sm select-none' : ''}`}>
                      {codiceVisibile}
                    </span>
                    <button onClick={() => setMostraCodice(!mostraCodice)} className="ml-3 flex-shrink-0">
                      {mostraCodice
                        ? <EyeOff className="w-5 h-5 text-gray-400" />
                        : <Eye    className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Non condividere questo codice con personale non autorizzato.
                  </p>
                </div>

                <button onClick={chiudiModalCodice} className="bg-gray-900 text-white rounded-xl py-3 font-medium">
                  Chiudi
                </button>

              </div>
            ) : (
              /* INPUT TOKEN */
              <div className="flex flex-col gap-4">

                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Apri <strong>Google Authenticator</strong> o <strong>Authy</strong> e inserisci il codice a 6 cifre di Supremi Advisor.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">
                    Codice Authenticator
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={token}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setToken(v);
                      setTokenError('');
                    }}
                    placeholder="000000"
                    className={`mt-1 border rounded-xl px-4 py-3 w-full text-2xl font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${
                      tokenError ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {tokenError && (
                    <p className="text-xs text-red-600 mt-1.5">{tokenError}</p>
                  )}
                </div>

                <button
                  onClick={verificaToken}
                  disabled={codiceLoading || token.length !== 6}
                  className="bg-gray-900 text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {codiceLoading ? 'Verifica in corso...' : 'Visualizza codice'}
                </button>

              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
