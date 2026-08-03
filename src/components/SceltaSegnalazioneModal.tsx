import { createPortal } from 'react-dom';
import { X, DoorOpen, Store } from 'lucide-react';
import { useScrollLock } from '../lib/useScrollLock';

interface Props {
  onClose: () => void;
  onScegliSaletta: () => void;
  onScegliAttivita: () => void;
}

/**
 * "Segnala problema" dalla home, senza una stazione già selezionata: invece
 * di mandare l'utente su un tab generico non filtrato, chiede subito "cosa
 * vuoi segnalare" e lo porta al posto giusto — un tap in meno rispetto a
 * dover prima cercare la stazione e poi la sezione giusta.
 */
export default function SceltaSegnalazioneModal({ onClose, onScegliSaletta, onScegliAttivita }: Props) {
  useScrollLock();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Cosa vuoi segnalare?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <button
            onClick={onScegliSaletta}
            className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <DoorOpen className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Problema in una saletta</p>
              <p className="text-xs text-gray-400">Guasto, codice errato, sezione bagni/cancelletto...</p>
            </div>
          </button>

          <button
            onClick={onScegliAttivita}
            className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Problema in un'attività</p>
              <p className="text-xs text-gray-400">Bar, hotel, market e altri servizi convenzionati</p>
            </div>
          </button>

          <p className="text-xs text-gray-400 text-center mt-1">
            Ti porteremo alla stazione giusta per completare la segnalazione
          </p>
        </div>

      </div>
    </div>,
    document.body
  );
}
