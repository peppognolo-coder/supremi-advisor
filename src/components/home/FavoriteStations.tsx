import React from 'react';
import { Star, MapPin } from 'lucide-react';
import type { FavoriteStationSummary } from '../../hooks/useHomeFavorites';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FavoriteStationsProps {
  stations: FavoriteStationSummary[];
  activeStationId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

// ---------------------------------------------------------------------------
// FavoriteStations
// ---------------------------------------------------------------------------

export const FavoriteStations: React.FC<FavoriteStationsProps> = ({
  stations,
  activeStationId,
  loading,
  onSelect,
}) => {
  return (
    <div>
      <div className="px-4 mb-3">
        <p className="section-title">Le mie stazioni</p>
      </div>

      {loading ? (
        // Skeleton scroll
        <div className="flex gap-3 px-4 pb-1 overflow-x-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-32 h-16 rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="mx-4 bg-white rounded-2xl border border-gray-100 px-4 py-5 text-center">
          <Star className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">Nessuna stazione preferita</p>
          <p className="text-xs text-gray-400 mt-1">
            Aggiungi le stazioni che usi più spesso dalla schermata Stazioni
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
          {stations.map((station) => {
            const isActive = station.id === activeStationId;
            return (
              <button
                key={station.id}
                onClick={() => onSelect(station.id)}
                className={[
                  'flex-shrink-0 flex flex-col gap-1 px-4 py-3 rounded-2xl border transition-all duration-150 active:scale-95',
                  isActive
                    ? 'bg-trenord-green border-trenord-green text-white shadow-md'
                    : 'bg-white border-gray-100 text-gray-800 shadow-sm',
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-white/70' : 'text-trenord-green'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      isActive ? 'text-white/60' : 'text-gray-400'
                    }`}
                  >
                    {station.codice}
                  </span>
                </div>
                <span className="text-sm font-semibold text-left max-w-[120px] truncate">
                  {station.nome}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};