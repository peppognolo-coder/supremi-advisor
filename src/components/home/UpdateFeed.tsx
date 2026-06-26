import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type FeedItemType = 'info' | 'avviso' | 'risolto';

export interface FeedItem {
  id: string;
  tipo: FeedItemType;
  titolo: string;
  descrizione: string;
  stazione?: string;
  /** Timestamp leggibile — verrà formattato dalla logica reale in futuro */
  tempo: string;
}

interface UpdateFeedProps {
  items: FeedItem[];
}

const TIPO_CONFIG: Record<
  FeedItemType,
  { icon: React.ReactNode; dotColor: string; iconColor: string; labelColor: string; label: string }
> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    dotColor: 'bg-blue-400',
    iconColor: 'text-blue-500',
    labelColor: 'text-blue-600 bg-blue-50',
    label: 'Info',
  },
  avviso: {
    icon: <AlertCircle className="w-4 h-4" />,
    dotColor: 'bg-orange-400',
    iconColor: 'text-orange-500',
    labelColor: 'text-orange-600 bg-orange-50',
    label: 'Avviso',
  },
  risolto: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    dotColor: 'bg-green-400',
    iconColor: 'text-trenord-green',
    labelColor: 'text-trenord-green bg-green-50',
    label: 'Risolto',
  },
};

export const UpdateFeed: React.FC<UpdateFeedProps> = ({ items }) => {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">Da sapere</p>
        {items.length > 0 && (
          <span className="text-xs font-medium text-trenord-green cursor-pointer">
            Vedi tutti
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-6 text-center">
          <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">Nessun aggiornamento</p>
          <p className="text-xs text-gray-400 mt-1">
            Qui compariranno le novità sulle tue stazioni
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const config = TIPO_CONFIG[item.tipo];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-start gap-3"
              >
                {/* Icona tipo */}
                <div className={`mt-0.5 flex-shrink-0 ${config.iconColor}`}>
                  {config.icon}
                </div>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">
                      {item.titolo}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                      {item.tempo}
                    </span>
                  </div>

                  {item.stazione && (
                    <p className="text-xs text-trenord-green font-medium mt-0.5">
                      {item.stazione}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {item.descrizione}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};