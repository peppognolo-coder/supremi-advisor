import { type HotelDatiExtra } from '../../lib/adminApi';

function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        value ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white border-gray-200 text-gray-700'
      }`}>
      <span className="text-base font-medium">{label}</span>
      <span className="text-sm">{value ? 'SÌ' : 'NO'}</span>
    </button>
  );
}

interface Props {
  value: HotelDatiExtra;
  onChange: (value: HotelDatiExtra) => void;
}

/**
 * Campi informativi hotel (telefono, servizi, note equipaggi).
 * Condiviso tra AddAttivitaModal.tsx e ContributoAttivitaForm.tsx —
 * prima erano duplicati e sono andati fuori sincrono (vedi conversazione:
 * il form Contributi non li aveva affatto). Un solo posto da mantenere.
 */
export default function HotelFieldsSection({ value, onChange }: Props) {
  function set<K extends keyof HotelDatiExtra>(key: K, v: HotelDatiExtra[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">🏨 Informazioni hotel</p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Telefono</label>
        <input
          value={value.telefono ?? ''}
          onChange={(e) => set('telefono', e.target.value)}
          placeholder="+39 02 1234567"
          type="tel"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-base bg-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Switch label="Reception H24" value={value.reception_h24 ?? false}
          onChange={(v) => set('reception_h24', v)} />
        <Switch label="Colazione disponibile" value={value.colazione ?? false}
          onChange={(v) => set('colazione', v)} />
        <Switch label="WiFi disponibile" value={value.wifi ?? false}
          onChange={(v) => set('wifi', v)} />
        <Switch label="Navetta disponibile" value={value.navetta ?? false}
          onChange={(v) => set('navetta', v)} />
        <Switch label="Ristorante interno" value={value.ristorante ?? false}
          onChange={(v) => set('ristorante', v)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note equipaggi</label>
        <textarea
          value={value.note_equipaggi ?? ''}
          onChange={(e) => set('note_equipaggi', e.target.value)}
          rows={3}
          placeholder="es. colazione dalle 6:00, navetta ogni 30 min, check-in anticipato possibile..."
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-base resize-none bg-white"
        />
      </div>
    </div>
  );
}
