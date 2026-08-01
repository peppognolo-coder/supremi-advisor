import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, ChevronRight } from 'lucide-react';
import type { FeedItem } from '../../lib/homeFeed';

export type { FeedItem };

type FeedItemType = FeedItem['tipo'];

interface UpdateFeedProps {
  items: FeedItem[];
  loading?: boolean;
  onItemClick?: (item: FeedItem) => void;
}

const TIPO_CONFIG: Record<
  FeedItemType,
  { icon: React.ReactNode; iconColor: string }
> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    iconColor: 'text-blue-500',
  },
  avviso: {
    icon: <AlertCircle className="w-4 h-4" />,
    iconColor: 'text-orange-500',
  },
  risolto: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    iconColor: 'text-trenord-green',
  },
};

export const UpdateFeed: React.FC<UpdateFeedProps> = ({ items, loading = false, onItemClick }) => {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">Da sapere</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 h-[72px] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
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
            const clickable = !!item.link && !!onItemClick;
            return (
              <div
                key={item.id}
                onClick={clickable ? () => onItemClick!(item) : undefined}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-start gap-3 ${
                  clickable ? 'cursor-pointer hover:border-gray-200 active:bg-gray-50 transition-colors' : ''
                }`}
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

                {clickable && (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
