import { Leaf, Sprout, WheatOff } from 'lucide-react';
import { OPZIONI_ALIMENTARI, type OpzioneAlimentareId } from '../../lib/adminApi';

const ICONE: Record<OpzioneAlimentareId, typeof Leaf> = {
  vegetariano: Leaf,
  vegano: Sprout,
  senza_glutine: WheatOff,
};

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Opzioni alimentari (vegetariano/vegano/senza glutine) per attività di
 * categoria alimentare (Bar, Ristorante, Pizzeria, Market, Fast Food).
 * Condiviso tra AddAttivitaModal.tsx e ContributoAttivitaForm.tsx —
 * stesso principio di HotelFieldsSection/QrCheckinUpload, per non
 * disallinearsi di nuovo tra i due form.
 */
export default function OpzioniAlimentariSection({ value, onChange }: Props) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-3 bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900 rounded-2xl p-4">
      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
        🌱 Opzioni alimentari (facoltativo)
      </p>

      <div className="flex flex-col gap-2">
        {OPZIONI_ALIMENTARI.map(({ id, label }) => {
          const Icon = ICONE[id];
          const checked = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors text-left ${
                checked ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-base font-medium flex-1">{label}</span>
              <span className="text-sm">{checked ? 'SÌ' : 'NO'}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Informazione segnalata dalla community, non certificata dal locale. Verifica sempre di persona.
      </p>
      {value.includes('senza_glutine') && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg px-2 py-1.5">
          ⚠️ Per la celiachia, chiedi sempre al locale come gestisce la contaminazione crociata in cucina — non basta l'assenza di glutine negli ingredienti.
        </p>
      )}
    </div>
  );
}
