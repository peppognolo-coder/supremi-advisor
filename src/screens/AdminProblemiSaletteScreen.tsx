import {
  useEffect,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  Wrench,
  X,
  FileDown,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  type SalettaProblema,
  getProblemiSalette,
  aggiornaStatoProblema,
} from '../lib/adminApi';

import { exportProblemiSalette } from '../lib/exportProblemiSalette';
import { getSezione } from '../lib/localitaSezioni';

// =========================
// PROPS
// =========================

interface Props {
  adminPin: string;
}

// =========================
// COSTANTI
// =========================

type FiltroStato = 'tutti' | 'aperta' | 'in_carico' | 'risolta' | 'archiviata';

const FILTRI: { mode: FiltroStato; label: string; color: string }[] = [
  { mode: 'tutti',      label: 'Tutti',        color: 'gray' },
  { mode: 'aperta',     label: 'Aperti',       color: 'red' },
  { mode: 'in_carico',  label: 'In carico',    color: 'amber' },
  { mode: 'risolta',    label: 'Risolti',      color: 'emerald' },
  { mode: 'archiviata', label: 'Archiviati',   color: 'gray' },
];

const STATO_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
}> = {
  aperta:     { label: 'Aperto',    bg: 'bg-red-100',     text: 'text-red-700',     icon: <AlertTriangle className="w-4 h-4" /> },
  in_carico:  { label: 'In carico', bg: 'bg-amber-100',   text: 'text-amber-700',   icon: <Wrench className="w-4 h-4" /> },
  risolta:    { label: 'Risolto',   bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
  archiviata: { label: 'Archiviato',bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-300',    icon: <Archive className="w-4 h-4" /> },
};

// =========================
// HELPERS
// =========================

function formatData(dateStr: string): string {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function tempoFa(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const ore  = Math.floor(diff / (1000 * 60 * 60));
  const gg   = Math.floor(ore / 24);
  if (gg > 0) return `${gg} giorn${gg === 1 ? 'o' : 'i'} fa`;
  if (ore > 0) return `${ore} or${ore === 1 ? 'a' : 'e'} fa`;
  return 'Poco fa';
}

// =========================
// COMPONENTE PRINCIPALE
// =========================

export default function AdminProblemiSaletteScreen({ adminPin }: Props) {

  const [loading, setLoading]       = useState(true);
  const [problemi, setProblemi]     = useState<SalettaProblema[]>([]);
  const [filtro, setFiltro]         = useState<FiltroStato>('aperta');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dettaglio, setDettaglio]   = useState<SalettaProblema | null>(null);
  const [esportando, setEsportando] = useState(false);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const res = await getProblemiSalette(adminPin);
    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore caricamento problemi');
      setLoading(false);
      return;
    }
    setProblemi(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // =========================
  // AGGIORNA STATO
  // =========================

  async function cambiaStato(id: string, stato: SalettaProblema['stato']) {
    setProcessingId(id);
    const res = await aggiornaStatoProblema(adminPin, id, stato);
    setProcessingId(null);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore aggiornamento');
      return;
    }

    const labels: Record<string, string> = {
      in_carico:  'Problema preso in carico',
      risolta:    'Problema segnato come risolto',
      archiviata: 'Problema archiviato',
      aperta:     'Problema riaperto',
    };
    toast.success(labels[stato] ?? 'Stato aggiornato');

    setProblemi((prev) =>
      prev.map((p) => p.id === id ? { ...p, stato } : p)
    );
    if (dettaglio?.id === id) {
      setDettaglio((prev) => prev ? { ...prev, stato } : null);
    }
  }

  // =========================
  // COMPUTED
  // =========================

  const contatori: Record<FiltroStato, number> = {
    tutti:      problemi.length,
    aperta:     problemi.filter((p) => p.stato === 'aperta').length,
    in_carico:  problemi.filter((p) => p.stato === 'in_carico').length,
    risolta:    problemi.filter((p) => p.stato === 'risolta').length,
    archiviata: problemi.filter((p) => p.stato === 'archiviata').length,
  };

  const filtrati = filtro === 'tutti'
    ? problemi
    : problemi.filter((p) => p.stato === filtro);

  async function handleEsporta() {
    if (filtrati.length === 0) {
      toast.error('Nessun problema da esportare con questo filtro');
      return;
    }
    setEsportando(true);
    try {
      const etichetta = FILTRI.find((f) => f.mode === filtro)?.label ?? 'tutti';
      await exportProblemiSalette(filtrati, etichetta.toLowerCase());
      toast.success('Report scaricato');
    } catch (err) {
      console.error(err);
      toast.error('Errore durante la generazione del report');
    } finally {
      setEsportando(false);
    }
  }

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* TITOLO */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Problemi Salette</h1>
            <p className="text-sm text-gray-500 mt-1">
              Segnalazioni fisiche del personale
            </p>
          </div>

          <button
            onClick={handleEsporta}
            disabled={esportando || filtrati.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex-shrink-0"
          >
            {esportando
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <FileDown className="w-4 h-4" />}
            {esportando ? 'Esporto...' : `Esporta (${filtrati.length})`}
          </button>
        </div>

        {/* STATISTICHE RAPIDE */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl border p-3 shadow-sm text-center ${contatori.aperta > 0 ? 'border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
              <div className={`text-2xl font-bold ${contatori.aperta > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {contatori.aperta}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Aperti</div>
            </div>
            <div className={`rounded-2xl border p-3 shadow-sm text-center ${contatori.in_carico > 0 ? 'border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
              <div className={`text-2xl font-bold ${contatori.in_carico > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {contatori.in_carico}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">In carico</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-emerald-600">{contatori.risolta}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Risolti</div>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-gray-400">{contatori.archiviata}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Archiviati</div>
            </div>
          </div>
        )}

        {/* FILTRI */}
        {!loading && (
          <div className="flex gap-2 flex-wrap">
            {FILTRI.map((f) => (
              <button
                key={f.mode}
                type="button"
                onClick={() => setFiltro(f.mode)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                  filtro === f.mode
                    ? 'bg-trenord-green text-white border-trenord-green'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-trenord-green hover:text-trenord-green'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  filtro === f.mode ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {contatori[f.mode]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && <div className="text-sm text-gray-500">Caricamento...</div>}

        {/* EMPTY */}
        {!loading && filtrati.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            {filtro === 'aperta'
              ? '✅ Nessun problema aperto. Ottimo!'
              : 'Nessun problema in questa categoria.'}
          </div>
        )}

        {/* LISTA */}
        {!loading && (
          <div className="flex flex-col gap-3">
            {filtrati.map((prob) => {
              const isProcessing = processingId === prob.id;
              const cfg = STATO_CONFIG[prob.stato] ?? STATO_CONFIG.aperta;

              return (
                <div
                  key={prob.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm flex flex-col gap-3"
                >

                  {/* TOP */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${
                      prob.stato === 'aperta' ? 'bg-red-100' :
                      prob.stato === 'in_carico' ? 'bg-amber-100' :
                      prob.stato === 'risolta' ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {prob.stato === 'aperta'    && <AlertTriangle className="w-5 h-5 text-red-600" />}
                      {prob.stato === 'in_carico' && <Wrench className="w-5 h-5 text-amber-600" />}
                      {prob.stato === 'risolta'   && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      {prob.stato === 'archiviata'&& <Archive className="w-5 h-5 text-gray-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{prob.tipo_problema}</h3>
                        {prob.sezione && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {getSezione(prob.sezione).label}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {prob.segnalazioni_count > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            🔺 {prob.segnalazioni_count} segnalazioni
                          </span>
                        )}
                      </div>

                      {/* SALETTA */}
                      {prob.salette && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">
                          {prob.salette.stazione}
                          {prob.salette.tipo && ` — ${prob.salette.tipo}`}
                        </p>
                      )}
                      {prob.salette?.ubicazione && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {prob.salette.ubicazione}</p>
                      )}

                      {/* TEMPO */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-xs text-gray-400">
                          Ultima segnalazione: {tempoFa(prob.updated_at)}
                        </span>
                      </div>

                      {/* NOTE */}
                      {prob.note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
                          {prob.note}
                        </p>
                      )}
                    </div>

                    {/* DETTAGLIO */}
                    <button
                      type="button"
                      onClick={() => setDettaglio(prob)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline flex-shrink-0"
                    >
                      Dettaglio
                    </button>
                  </div>

                  {/* AZIONI */}
                  <div className="flex gap-2 flex-wrap">

                    {prob.stato === 'aperta' && (
                      <button
                        type="button"
                        onClick={() => cambiaStato(prob.id, 'in_carico')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {isProcessing
                          ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <Wrench className="w-3.5 h-3.5" />}
                        Prendi in carico
                      </button>
                    )}

                    {(prob.stato === 'aperta' || prob.stato === 'in_carico') && (
                      <button
                        type="button"
                        onClick={() => cambiaStato(prob.id, 'risolta')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {isProcessing
                          ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <CheckCircle className="w-3.5 h-3.5" />}
                        Risolto
                      </button>
                    )}

                    {prob.stato !== 'archiviata' && (
                      <button
                        type="button"
                        onClick={() => cambiaStato(prob.id, 'archiviata')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archivia
                      </button>
                    )}

                    {prob.stato === 'archiviata' && (
                      <button
                        type="button"
                        onClick={() => cambiaStato(prob.id, 'aperta')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Riapri
                      </button>
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL DETTAGLIO */}
      {dettaglio && createPortal(
        <div
          className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDettaglio(null); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-5 flex flex-col gap-4">

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Dettaglio problema</h2>
              <button onClick={() => setDettaglio(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              {[
                { label: 'Tipo problema', value: dettaglio.tipo_problema },
                { label: 'Saletta', value: dettaglio.salette ? `${dettaglio.salette.stazione} — ${dettaglio.salette.tipo}` : dettaglio.saletta_id },
                { label: 'Ubicazione', value: dettaglio.salette?.ubicazione ?? '—' },
                { label: 'Stato', value: STATO_CONFIG[dettaglio.stato]?.label ?? dettaglio.stato },
                { label: 'Segnalazioni', value: `${dettaglio.segnalazioni_count} segnalazion${dettaglio.segnalazioni_count === 1 ? 'e' : 'i'}` },
                { label: 'Prima segnalazione', value: formatData(dettaglio.created_at) },
                { label: 'Ultima segnalazione', value: formatData(dettaglio.updated_at) },
                { label: 'Note', value: dettaglio.note ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium flex-shrink-0">{label}</span>
                  <span className="text-gray-900 dark:text-gray-100 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* AZIONI NEL MODAL */}
            <div className="flex gap-2 flex-wrap">
              {dettaglio.stato === 'aperta' && (
                <button onClick={() => cambiaStato(dettaglio.id, 'in_carico')}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:opacity-90">
                  Prendi in carico
                </button>
              )}
              {(dettaglio.stato === 'aperta' || dettaglio.stato === 'in_carico') && (
                <button onClick={() => cambiaStato(dettaglio.id, 'risolta')}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90">
                  Risolto
                </button>
              )}
              {dettaglio.stato !== 'archiviata' && (
                <button onClick={() => cambiaStato(dettaglio.id, 'archiviata')}
                  className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:opacity-90">
                  Archivia
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
