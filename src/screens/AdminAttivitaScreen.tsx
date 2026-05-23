import {
  useEffect,
  useState,
} from 'react';

import {
  RotateCcw,
  Trash2,
  Store,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

// =========================
// TIPI
// =========================

type FiltroMode =
  | 'tutte'
  | 'attive'
  | 'eliminate';

interface AttivitaRow {

  id: string;

  stazione_id: string;

  nome: string;

  categoria: string;

  distanza_piedi: string | null;

  convenzionato: boolean;

  is_active: boolean;

  deleted_at: string | null;

  note: string | null;
}

interface StazioneRow {

  id: string;

  nome: string;
}

// =========================
// FILTRO OPTIONS
// =========================

const FILTRO_OPTIONS: {
  mode: FiltroMode;
  label: string;
}[] = [

  {
    mode: 'tutte',
    label: 'Tutte',
  },

  {
    mode: 'attive',
    label: 'Attive',
  },

  {
    mode: 'eliminate',
    label: 'Eliminate',
  },

];

// =========================
// COMPONENTE
// =========================

export default function AdminAttivitaScreen() {

  const [loading, setLoading] =
    useState(true);

  const [attivita, setAttivita] =
    useState<AttivitaRow[]>([]);

  const [stazioni, setStazioni] =
    useState<StazioneRow[]>([]);

  // Default: Attive (punto 3)
  const [filtro, setFiltro] =
    useState<FiltroMode>('attive');

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    // Fetch TUTTE le attività
    // senza filtro is_active —
    // l'admin vede tutto
    const {
      data: attivitaData,
      error: attivitaError,
    } = await supabase
      .from('attivita_stazione')
      .select('*')
      .order('nome', {
        ascending: true,
      });

    if (attivitaError) {

      console.error(
        attivitaError
      );

      alert(
        'Operazione non riuscita'
      );

      setLoading(false);

      return;
    }

    const {
      data: stazioniData,
      error: stazioniError,
    } = await supabase
      .from('stazioni')
      .select('id,nome');

    if (stazioniError) {

      console.error(
        stazioniError
      );
    }

    setAttivita(
      attivitaData ?? []
    );

    setStazioni(
      stazioniData ?? []
    );

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // SOFT DELETE (punto 1)
  // update is_active + deleted_at
  // NO .delete()
  // =========================

  async function softDelete(
    attivita: AttivitaRow
  ) {

    const confermato =
      window.confirm(
        `Eliminare questa attività?\n\nL'attività verrà nascosta agli utenti ma potrà essere ripristinata.`
      );

    if (!confermato) {
      return;
    }

    setProcessingId(attivita.id);

    const { error } =
      await supabase
        .from('attivita_stazione')
        .update({
          is_active: false,
          deleted_at:
            new Date().toISOString(),
        })
        .eq('id', attivita.id);

    if (error) {

      console.error(error);

      alert(
        'Operazione non riuscita'
      );

      setProcessingId(null);

      return;
    }

    // Aggiorna UI immediatamente
    // senza fare reload completo
    setAttivita((prev) =>
      prev.map((a) =>
        a.id === attivita.id
          ? {
              ...a,
              is_active: false,
              deleted_at:
                new Date()
                  .toISOString(),
            }
          : a
      )
    );

    setProcessingId(null);
  }

  // =========================
  // RIPRISTINA (punto 2)
  // update is_active + deleted_at
  // =========================

  async function ripristina(
    attivita: AttivitaRow
  ) {

    const confermato =
      window.confirm(
        `Ripristinare "${attivita.nome}"?\n\nL'attività tornerà visibile agli utenti.`
      );

    if (!confermato) {
      return;
    }

    setProcessingId(attivita.id);

    const { error } =
      await supabase
        .from('attivita_stazione')
        .update({
          is_active: true,
          deleted_at: null,
        })
        .eq('id', attivita.id);

    if (error) {

      console.error(error);

      alert(
        'Operazione non riuscita'
      );

      setProcessingId(null);

      return;
    }

    // Aggiorna UI immediatamente
    setAttivita((prev) =>
      prev.map((a) =>
        a.id === attivita.id
          ? {
              ...a,
              is_active: true,
              deleted_at: null,
            }
          : a
      )
    );

    setProcessingId(null);
  }

  // =========================
  // HELPERS
  // =========================

  function getNomeStazione(
    stazioneId: string
  ): string {

    return (
      stazioni.find(
        (s) => s.id === stazioneId
      )?.nome ?? stazioneId
    );
  }

  function formatDeletedAt(
    deleted_at: string | null
  ): string {

    if (!deleted_at) return '';

    return new Date(
      deleted_at
    ).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // =========================
  // COMPUTED (punto 3 e 5)
  // =========================

  const attivitaFiltrate =
    attivita.filter((a) => {

      if (filtro === 'attive') {
        // is_active === true
        return a.is_active === true;
      }

      if (filtro === 'eliminate') {
        // is_active === false
        return a.is_active === false;
      }

      // 'tutte'
      return true;
    });

  const conteggioAttive =
    attivita.filter(
      (a) => a.is_active === true
    ).length;

  const conteggioEliminate =
    attivita.filter(
      (a) => a.is_active === false
    ).length;

  // =========================
  // UI
  // =========================

  return (

    <div className="flex flex-col gap-4">

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Gestione Attività

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Visualizza e gestisci le attività delle stazioni

        </p>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="text-sm text-gray-500">

          Caricamento...

        </div>
      )}

      {/* CONTATORI */}
      {!loading && (

        <div className="grid grid-cols-3 gap-3">

          <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">

            <div className="text-2xl font-bold text-gray-900">

              {attivita.length}

            </div>

            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">

              Totali

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-3 shadow-sm text-center">

            <div className="text-2xl font-bold text-emerald-600">

              {conteggioAttive}

            </div>

            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">

              Attive

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-red-100 p-3 shadow-sm text-center">

            <div className="text-2xl font-bold text-red-500">

              {conteggioEliminate}

            </div>

            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">

              Eliminate

            </div>

          </div>

        </div>
      )}

      {/* FILTRI (punto 3) */}
      {!loading && (

        <div className="flex gap-2">

          {FILTRO_OPTIONS.map(
            (opt) => (

              <button
                key={opt.mode}
                type="button"
                onClick={() =>
                  setFiltro(opt.mode)
                }
                className={`
                  px-4
                  py-2
                  rounded-xl
                  text-sm
                  font-medium
                  border
                  transition-colors
                  ${
                    filtro === opt.mode
                      ? 'bg-trenord-green text-white border-trenord-green'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-trenord-green hover:text-trenord-green'
                  }
                `}
              >

                {opt.label}

                {opt.mode === 'attive' && (

                  <span
                    className={`
                      ml-1.5
                      text-xs
                      px-1.5
                      py-0.5
                      rounded-full
                      ${
                        filtro === 'attive'
                          ? 'bg-white/20'
                          : 'bg-emerald-100 text-emerald-700'
                      }
                    `}
                  >

                    {conteggioAttive}

                  </span>
                )}

                {opt.mode === 'eliminate' && (

                  <span
                    className={`
                      ml-1.5
                      text-xs
                      px-1.5
                      py-0.5
                      rounded-full
                      ${
                        filtro === 'eliminate'
                          ? 'bg-white/20'
                          : 'bg-red-100 text-red-600'
                      }
                    `}
                  >

                    {conteggioEliminate}

                  </span>
                )}

              </button>
            )
          )}

        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        attivitaFiltrate.length === 0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

          {filtro === 'eliminate'
            ? 'Nessuna attività eliminata'
            : filtro === 'attive'
            ? 'Nessuna attività attiva'
            : 'Nessuna attività presente'}

        </div>
      )}

      {/* LIST */}
      {!loading && (

        <div className="flex flex-col gap-3">

          {attivitaFiltrate.map(
            (a) => {

              const isActive =
                a.is_active === true;

              const isProcessing =
                processingId === a.id;

              return (

                <div
                  key={a.id}
                  className={`
                    bg-white
                    rounded-2xl
                    border
                    p-4
                    shadow-sm
                    flex
                    flex-col
                    gap-3
                    transition-opacity
                    ${
                      isActive
                        ? 'border-gray-100'
                        : 'border-red-100 opacity-70'
                    }
                  `}
                >

                  {/* TOP */}
                  <div className="flex items-start gap-3">

                    {/* ICON */}
                    <div
                      className={`
                        flex-shrink-0
                        w-10
                        h-10
                        rounded-2xl
                        flex
                        items-center
                        justify-center
                        ${
                          isActive
                            ? 'bg-trenord-green/10'
                            : 'bg-red-50'
                        }
                      `}
                    >

                      <Store
                        className={`
                          w-5 h-5
                          ${
                            isActive
                              ? 'text-trenord-green'
                              : 'text-red-400'
                          }
                        `}
                      />

                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 flex-wrap">

                        <h3 className="font-semibold text-gray-900">

                          {a.nome}

                        </h3>

                        {/* BADGE STATO (punto 4) */}
                        <span
                          className={`
                            px-2
                            py-0.5
                            rounded-full
                            text-xs
                            font-semibold
                            ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-600'
                            }
                          `}
                        >

                          {isActive
                            ? '🟢 Attiva'
                            : '🔴 Eliminata'}

                        </span>

                        {a.convenzionato && (

                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-trenord-green/10 text-trenord-green">

                            Convenzionato

                          </span>
                        )}

                      </div>

                      <p className="text-sm text-gray-500 mt-0.5">

                        {getNomeStazione(
                          a.stazione_id
                        )}

                      </p>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">

                        <span className="text-xs text-gray-400">

                          {a.categoria}

                        </span>

                        {a.distanza_piedi && (

                          <span className="text-xs text-gray-400">

                            🚶 {a.distanza_piedi}

                          </span>
                        )}

                      </div>

                      {/* DATA ELIMINAZIONE */}
                      {!isActive &&
                        a.deleted_at && (

                        <p className="text-xs text-red-400 mt-1">

                          Eliminata il{' '}
                          {formatDeletedAt(
                            a.deleted_at
                          )}

                        </p>
                      )}

                      {a.note && (

                        <p className="text-xs text-gray-400 italic mt-1">

                          {a.note}

                        </p>
                      )}

                    </div>

                  </div>

                  {/* AZIONI (punto 7: disabilita durante operazione) */}
                  <div className="flex gap-2">

                    {isActive ? (

                      // SOFT DELETE (punto 1)
                      <button
                        type="button"
                        onClick={() =>
                          softDelete(a)
                        }
                        disabled={
                          isProcessing
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          px-4
                          py-2
                          rounded-xl
                          bg-red-600
                          text-white
                          text-sm
                          font-medium
                          hover:opacity-90
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                          transition-opacity
                        "
                      >

                        {isProcessing ? (

                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />

                        ) : (

                          <Trash2 className="w-4 h-4" />
                        )}

                        {isProcessing
                          ? 'Eliminazione...'
                          : 'Elimina'}

                      </button>

                    ) : (

                      // RIPRISTINA (punto 2)
                      <button
                        type="button"
                        onClick={() =>
                          ripristina(a)
                        }
                        disabled={
                          isProcessing
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          px-4
                          py-2
                          rounded-xl
                          bg-emerald-600
                          text-white
                          text-sm
                          font-medium
                          hover:opacity-90
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                          transition-opacity
                        "
                      >

                        {isProcessing ? (

                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />

                        ) : (

                          <RotateCcw className="w-4 h-4" />
                        )}

                        {isProcessing
                          ? 'Ripristino...'
                          : 'Ripristina'}

                      </button>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}
