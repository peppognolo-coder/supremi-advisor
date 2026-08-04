import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal di conferma per un'eliminazione DEFINITIVA (hard delete),
 * irreversibile. A differenza del ConfirmModal usato per il soft delete
 * (Annulla/Elimina), qui si richiede di digitare il nome esatto
 * dell'elemento prima che il bottone di conferma si attivi — protegge da
 * click sbagliati su liste con elementi simili, cosa che una semplice
 * conferma non garantisce. Usato da AdminAttivitaScreen, AdminSaletteScreen
 * e AdminStazioniScreen nella sezione "Eliminate". Vedi conversazione.
 */
export default function ConfirmHardDeleteModal({
  nome,
  entityLabel,
  onConfirm,
  onCancel,
  loading,
  blockedMessage,
}: {
  /** Nome esatto che l'utente deve digitare per confermare. */
  nome: string;
  /** Es. "l'attività", "la saletta", "la stazione" — usato nel testo del modal. */
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  /** Se valorizzato, l'eliminazione è bloccata (es. stazione con elementi collegati): mostra il messaggio e disabilita la conferma. */
  blockedMessage?: string | null;
}) {
  const [inputValue, setInputValue] = useState('');
  const isMatch = inputValue.trim() === nome.trim();
  const isBlocked = !!blockedMessage;

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Eliminazione definitiva</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Questa azione è irreversibile: {entityLabel} verrà rimossa per sempre, non potrà più essere ripristinata.
            </p>
          </div>
        </div>

        {isBlocked ? (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            {blockedMessage}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">
              Per confermare, digita esattamente: <span className="font-semibold text-gray-700 dark:text-gray-300">{nome}</span>
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              autoFocus
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {isBlocked ? 'Chiudi' : 'Annulla'}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              disabled={loading || !isMatch}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : null}
              {loading ? 'Eliminazione...' : 'Elimina definitivamente'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
