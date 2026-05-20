import type { StatoSaletta } from '../lib/database.types';

const config: Record<StatoSaletta, { label: string; classes: string }> = {
  aperta: { label: 'Aperta', classes: 'bg-emerald-100 text-emerald-700' },
  chiusa: { label: 'Chiusa', classes: 'bg-red-100 text-red-600' },
  manutenzione: { label: 'Manutenzione', classes: 'bg-amber-100 text-amber-700' },
};

export default function StatoBadge({ stato }: { stato: StatoSaletta }) {
  const { label, classes } = config[stato];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  );
}
