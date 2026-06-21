import { useState } from 'react';
import { useScrollLock } from '../lib/useScrollLock';

import {
  Shield,
  X,
  Delete,
} from 'lucide-react';

interface Props {
  mode: 'login' | 'logout';
  onConfirm: (pin?: string) => void;
  onClose: () => void;
}

function Key({
  label,
  onPress,
  variant = 'default',
}: {
  label: string | React.ReactNode;
  onPress: () => void;
  variant?: 'default' | 'action' | 'delete';
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`
        h-16 rounded-2xl text-xl font-semibold
        flex items-center justify-center
        active:scale-95 transition-transform
        ${variant === 'default'
          ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          : variant === 'action'
          ? 'bg-trenord-green text-white hover:opacity-90'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }
      `}
    >
      {label}
    </button>
  );
}

export default function AdminPinModal({
  mode,
  onConfirm,
  onClose,
}: Props) {
  useScrollLock();


  const [pin, setPin] = useState('');
  const MAX_LEN = 4;

  function pressDigit(digit: string) {
    if (pin.length < MAX_LEN) {
      setPin((prev) => prev + digit);
    }
  }

  function deleteLast() {
    setPin((prev) => prev.slice(0, -1));
  }

  function handleConfirm() {
    onConfirm(pin);
    setPin('');
  }

  // =========================
  // LOGOUT VIEW
  // =========================

  if (mode === 'logout') {
    return (
      <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Disattiva Admin</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <p className="text-sm text-gray-500">Vuoi disattivare la modalità admin?</p>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 rounded-2xl py-3 font-semibold text-sm hover:bg-gray-50 transition-colors">
              Annulla
            </button>
            <button onClick={() => onConfirm()} className="flex-1 bg-red-500 text-white rounded-2xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity">
              Disattiva
            </button>
          </div>

        </div>
      </div>
    );
  }

  // =========================
  // LOGIN — TASTIERINO
  // =========================

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-trenord-green" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Accesso Admin</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* INDICATORI PIN */}
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: MAX_LEN }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-trenord-green scale-110'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* TASTIERINO */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <Key key={d} label={d} onPress={() => pressDigit(d)} />
          ))}
          <div />
          <Key label="0" onPress={() => pressDigit('0')} />
          <Key label={<Delete className="w-5 h-5" />} onPress={deleteLast} variant="delete" />
        </div>

        {/* CONFERMA */}
        <button
          onClick={handleConfirm}
          disabled={pin.length === 0}
          className="bg-trenord-green text-white rounded-2xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Accedi
        </button>

      </div>
    </div>
  );
}
