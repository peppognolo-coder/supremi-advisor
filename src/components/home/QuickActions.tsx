import React from 'react';
import { PlusCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface QuickActionsProps {
  onNuovoContributo: () => void;
  onSegnalaProblema: () => void;
  onApriStazione: () => void;
  /** Se undefined, i pulsanti sono disabilitati (nessuna stazione selezionata) */
  stazioneId?: string;
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  iconBg: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNuovoContributo,
  onSegnalaProblema,
  onApriStazione,
  stazioneId,
}) => {
  const disabled = !stazioneId;

  const actions: ActionButton[] = [
    {
      label: 'Nuovo contributo',
      icon: <PlusCircle className="w-5 h-5" />,
      onClick: onNuovoContributo,
      color: 'text-trenord-green',
      iconBg: 'bg-green-50',
    },
    {
      label: 'Segnala problema',
      icon: <AlertTriangle className="w-5 h-5" />,
      onClick: onSegnalaProblema,
      color: 'text-orange-600',
      iconBg: 'bg-orange-50',
    },
    {
      label: 'Apri stazione',
      icon: <ExternalLink className="w-5 h-5" />,
      onClick: onApriStazione,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
  ];

  return (
    <div className="px-4">
      <p className="section-title mb-3">Azioni rapide</p>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={disabled}
            className={[
              'flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm',
              'active:scale-95 transition-all duration-150',
              disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-gray-200 hover:shadow',
            ].join(' ')}
          >
            <div className={`${action.iconBg} ${action.color} p-2 rounded-xl`}>
              {action.icon}
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};