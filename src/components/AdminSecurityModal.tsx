import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Smartphone, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useScrollLock } from '../lib/useScrollLock';

interface Props {
  adminPin: string;
  onClose: () => void;
  onPinChanged: (newPin: string) => void;
}

/**
 * Sicurezza Admin: configurazione dell'autenticatore DEDICATO (separato da
 * quello del personale usato per i codici salette — vedi conversazione: usare
 * lo stesso segreto per entrambi avrebbe permesso a chiunque lo configuri
 * per un codice saletta di generare anche codici validi per cambiare il PIN
 * admin) e cambio del PIN, protetto da PIN attuale + codice di questo
 * autenticatore dedicato.
 */
export default function AdminSecurityModal({ adminPin, onClose, onPinChanged }: Props) {
  useScrollLock();

  const [sezione, setSezione] = useState<'menu' | 'totp' | 'pin'>('menu');

  // ── Configurazione autenticatore dedicato ──────────────────────────────
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');

  async function caricaQrTotpAdmin() {
    setTotpLoading(true);
    setTotpError('');
    try {
      const res = await fetch('/.netlify/functions/get-admin-totp-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error ?? 'Errore caricamento QR.');
        return;
      }
      setTotpQr(data.qrDataUrl);
      setTotpSecret(data.secret);
    } catch {
      setTotpError('Errore di rete.');
    } finally {
      setTotpLoading(false);
    }
  }

  // ── Cambio PIN ──────────────────────────────────────────────────────────
  const [pinAttuale, setPinAttuale] = useState('');
  const [nuovoPin, setNuovoPin] = useState('');
  const [confermaPin, setConfermaPin] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [mostraPin, setMostraPin] = useState(false);
  const [cambioLoading, setCambioLoading] = useState(false);

  async function submitCambioPin() {
    if (!/^\d{4}$/.test(nuovoPin)) {
      toast.error('Il nuovo PIN deve essere di 4 cifre');
      return;
    }
    if (nuovoPin !== confermaPin) {
      toast.error('I due PIN non coincidono');
      return;
    }
    if (!/^\d{6}$/.test(totpToken)) {
      toast.error("Inserisci il codice a 6 cifre dell'autenticatore admin");
      return;
    }

    setCambioLoading(true);
    try {
      const res = await fetch('/.netlify/functions/change-admin-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: pinAttuale, newPin: nuovoPin, totpToken }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? 'Errore cambio PIN');
        return;
      }
      toast.success('PIN aggiornato');
      onPinChanged(nuovoPin);
      onClose();
    } catch {
      toast.error('Errore di rete');
    } finally {
      setCambioLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[85dvh] overflow-hidden shadow-2xl">

        {/* HEADER */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-trenord-green" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Sicurezza Admin</h2>
              <p className="text-xs text-gray-400">PIN e autenticatore dedicato</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">

          {sezione === 'menu' && (
            <>
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
                L'autenticatore qui sotto è <strong>diverso</strong> da quello che il personale usa per vedere i codici delle salette — nessun collega può usarlo per cambiare il PIN, nemmeno se lo ha già configurato sul proprio telefono.
              </p>

              <button
                onClick={() => { setSezione('totp'); if (!totpQr) caricaQrTotpAdmin(); }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <Smartphone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Configura autenticatore admin</p>
                  <p className="text-xs text-gray-400">QR dedicato, da scansionare una volta</p>
                </div>
              </button>

              <button
                onClick={() => setSezione('pin')}
                className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <KeyRound className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Cambia PIN</p>
                  <p className="text-xs text-gray-400">Richiede PIN attuale + autenticatore admin</p>
                </div>
              </button>
            </>
          )}

          {sezione === 'totp' && (
            <div className="flex flex-col gap-4">
              <button onClick={() => setSezione('menu')} className="text-sm text-gray-500 self-start">← Indietro</button>

              {totpLoading && <p className="text-sm text-gray-400 text-center py-6">Caricamento QR...</p>}
              {totpError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{totpError}</p>}

              {totpQr && !totpLoading && (
                <>
                  <p className="text-sm text-gray-600">
                    Scansiona con Google Authenticator, Authy o app equivalente — usa un'app <strong>diversa da quella del personale</strong>, o la stessa app ma come voce separata (comparirà come "Supremi Advisor (Admin)").
                  </p>
                  <img src={totpQr} alt="QR autenticatore admin" className="w-48 h-48 mx-auto rounded-xl border border-gray-200" />
                  {totpSecret && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Codice manuale (se non riesci a scansionare)</p>
                      <p className="font-mono text-sm text-gray-700 break-all">{totpSecret}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {sezione === 'pin' && (
            <div className="flex flex-col gap-3">
              <button onClick={() => setSezione('menu')} className="text-sm text-gray-500 self-start">← Indietro</button>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">PIN attuale</label>
                <div className="relative">
                  <input
                    type={mostraPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={pinAttuale}
                    onChange={(e) => setPinAttuale(e.target.value.replace(/\D/g, ''))}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 w-full text-base pr-10"
                  />
                  <button type="button" onClick={() => setMostraPin((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {mostraPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Nuovo PIN (4 cifre)</label>
                <input
                  type={mostraPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={nuovoPin}
                  onChange={(e) => setNuovoPin(e.target.value.replace(/\D/g, ''))}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 w-full text-base"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Conferma nuovo PIN</label>
                <input
                  type={mostraPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={confermaPin}
                  onChange={(e) => setConfermaPin(e.target.value.replace(/\D/g, ''))}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 w-full text-base"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Codice autenticatore admin (6 cifre)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 w-full text-base font-mono tracking-widest"
                />
                <p className="text-xs text-gray-400">Non configurato? Torna indietro e scansiona prima il QR.</p>
              </div>

              <button
                onClick={submitCambioPin}
                disabled={cambioLoading}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-trenord-green text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 mt-2"
              >
                {cambioLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {cambioLoading ? 'Aggiornamento...' : 'Cambia PIN'}
              </button>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div
          className="flex-shrink-0 px-5 pt-4 border-t border-gray-100 bg-white"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
