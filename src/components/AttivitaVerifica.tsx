import {
  useState,
  useEffect,
} from 'react';

import {
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { getDeviceId } from '../lib/device';

import SegnalaProblemaAttivitaModal from './SegnalaProblemaAttivitaModal';

// =========================
// COSTANTI
// =========================

const GIORNI_LIMITE = 7;
const LS_KEY = 'supremi_verifiche_attivita';

// =========================
// HELPERS localStorage
// =========================

interface CacheEntry {
  data: string;
  is_correct: boolean;
}

function getLSCache(): Record<string, CacheEntry> {

  try {

    const raw = localStorage.getItem(LS_KEY);

    return raw ? JSON.parse(raw) : {};

  } catch {

    return {};
  }
}

function setLSCache(
  attivitaId: string,
  entry: CacheEntry
) {

  try {

    const cache = getLSCache();

    cache[attivitaId] = entry;

    localStorage.setItem(
      LS_KEY,
      JSON.stringify(cache)
    );

  } catch {

    // ignore
  }
}

// =========================
// HELPERS DATE
// =========================

function giorniDa(isoDate: string): number {

  const ms =
    Date.now() -
    new Date(isoDate).getTime();

  return Math.floor(
    ms / (1000 * 60 * 60 * 24)
  );
}

function formatData(isoDate: string): string {

  return new Date(isoDate)
    .toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
}

// =========================
// TIPI
// =========================

interface VerificaStats {

  totaleConferme: number;

  ultimaConferma: string | null;

  miaUltimaVerifica: string | null;

  miaUltimaIsCorrect: boolean | null;
}

interface Props {

  attivitaId: string;
}

export default function AttivitaVerifica({
  attivitaId,
}: Props) {

  const [stats, setStats] =
    useState<VerificaStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const deviceId = getDeviceId();

  // =========================
  // LOAD
  // =========================

  async function loadVerifiche() {

    setLoading(true);

    const { data, error } =
      await supabase
        .from('attivita_verifiche')
        .select('is_correct, device_id, created_at')
        .eq('attivita_id', attivitaId)
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {

      console.error(error);

      setLoading(false);

      return;
    }

    const verifiche = data ?? [];

    const totaleConferme =
      verifiche.filter(
        (v) => v.is_correct
      ).length;

    const ultimaConfermaRec =
      verifiche.find(
        (v) => v.is_correct
      );

    const miaVerifica =
      verifiche.find(
        (v) => v.device_id === deviceId
      );

    const newStats: VerificaStats = {
      totaleConferme,
      ultimaConferma:
        ultimaConfermaRec?.created_at ?? null,
      miaUltimaVerifica:
        miaVerifica?.created_at ?? null,
      miaUltimaIsCorrect:
        miaVerifica?.is_correct ?? null,
    };

    setStats(newStats);

    if (miaVerifica) {

      setLSCache(attivitaId, {
        data: miaVerifica.created_at,
        is_correct: miaVerifica.is_correct,
      });
    }

    setLoading(false);
  }

  useEffect(() => {

    loadVerifiche();

  }, [attivitaId]);

  // =========================
  // POSSO VERIFICARE?
  // =========================

  function puoVerificare(): boolean {

    if (!stats?.miaUltimaVerifica) return true;

    return (
      giorniDa(stats.miaUltimaVerifica) >=
      GIORNI_LIMITE
    );
  }

  // =========================
  // CONFERMA POSITIVA
  // =========================

  async function conferma() {

    if (!puoVerificare() || submitting) return;

    setSubmitting(true);

    try {

      const { error } =
        await supabase
          .from('attivita_verifiche')
          .insert({
            attivita_id: attivitaId,
            is_correct: true,
            device_id: deviceId,
            tipo_problema: null,
            nota: null,
          });

      if (error) {

        console.error(error);

        toast.error('Errore invio verifica');

        return;
      }

      const now = new Date().toISOString();

      setLSCache(attivitaId, {
        data: now,
        is_correct: true,
      });

      toast.success('Grazie per la verifica!');

      await loadVerifiche();

    } catch (err) {

      console.error(err);

      toast.error('Errore imprevisto');

    } finally {

      setSubmitting(false);
    }
  }

  // =========================
  // STATO BADGE
  // =========================

  function renderStatoBadge() {

    if (!stats) return null;

    const { ultimaConferma, totaleConferme } = stats;

    if (!ultimaConferma || totaleConferme === 0) {

      return (

        <div className="flex items-center gap-1.5 text-xs text-gray-400">

          <Clock className="w-3.5 h-3.5" />

          <span>Nessuna verifica recente</span>

        </div>
      );
    }

    const giorni = giorniDa(ultimaConferma);

    const colore =
      giorni <= 7
        ? 'text-emerald-600'
        : giorni <= 30
        ? 'text-amber-600'
        : 'text-gray-400';

    const iconColore =
      giorni <= 7
        ? 'text-emerald-500'
        : giorni <= 30
        ? 'text-amber-500'
        : 'text-gray-400';

    return (

      <div className={`flex items-center gap-1.5 text-xs ${colore}`}>

        <CheckCircle className={`w-3.5 h-3.5 ${iconColore}`} />

        <span>

          {totaleConferme === 1
            ? 'Confermata da 1 collega'
            : `Confermata da ${totaleConferme} colleghi`}

          {' · '}

          {giorni === 0
            ? 'oggi'
            : giorni === 1
            ? 'ieri'
            : `${giorni} giorni fa`}

        </span>

      </div>
    );
  }

  // =========================
  // RENDER
  // =========================

  if (loading) return null;

  const puoFareVerifica = puoVerificare();

  const miaDataVerifica =
    stats?.miaUltimaVerifica &&
    !puoFareVerifica
      ? formatData(stats.miaUltimaVerifica)
      : null;

  return (

    <>

      <div className="border-t border-gray-100 pt-3 flex flex-col gap-3 mt-1">

        {/* BADGE STATO */}
        {renderStatoBadge()}

        {/* TITOLO */}
        <p className="text-xs font-medium text-gray-600">

          Le informazioni sono aggiornate?

        </p>

        {/* AZIONI */}
        <div className="flex gap-2">

          {/* CONFERMA */}
          <button
            type="button"
            onClick={conferma}
            disabled={!puoFareVerifica || submitting}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium transition-colors ${
              puoFareVerifica
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >

            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />

            <span>

              {submitting
                ? 'Invio...'
                : puoFareVerifica
                ? 'Informazioni corrette'
                : `Verificato il ${miaDataVerifica}`}

            </span>

          </button>

          {/* SEGNALA */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >

            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />

            <span className="whitespace-nowrap">

              Segnala problema

            </span>

          </button>

        </div>

      </div>

      {/* MODAL */}
      {showModal && (

        <SegnalaProblemaAttivitaModal
          attivitaId={attivitaId}
          onClose={() => setShowModal(false)}
          onSuccess={loadVerifiche}
        />
      )}

    </>
  );
}