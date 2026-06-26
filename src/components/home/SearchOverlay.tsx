import React, { useEffect, useRef } from 'react';
import { Search, X, MapPin, ChevronRight } from 'lucide-react';
import { useStationSearch } from '../hooks/useStationSearch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (id: string) => void;
  activeStationId: string | null;
}

// ---------------------------------------------------------------------------
// SearchOverlay
// ---------------------------------------------------------------------------

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  onSelectStation,
  activeStationId,
}) => {
  const { query, setQuery, results, loadingAll, reset } = useStationSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus automatico all'apertura
  useEffect(() => {
    if (isOpen) {
      // Piccolo delay per attendere il mount dell'overlay
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      reset();
    }
  }, [isOpen, reset]);

  // Chiudi con ESC da tastiera
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSelect(id: string) {
    onSelectStation(id);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header + Input */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Cambia stazione</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome o codice…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 active:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista risultati */}
        <div className="overflow-y-auto flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {loadingAll ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-trenord-green border-t-transparent animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400 font-medium">Nessuna stazione trovata</p>
              <p className="text-xs text-gray-400 mt-1">Prova con un nome diverso</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {!query && (
                <p className="text-xs text-gray-400 font-medium mb-2">Stazioni recenti</p>
              )}
              {results.map((station) => {
                const isActive = station.id === activeStationId;
                return (
                  <button
                    key={station.id}
                    onClick={() => handleSelect(station.id)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors',
                      isActive
                        ? 'bg-trenord-green/10 border border-trenord-green/20'
                        : 'hover:bg-gray-50 active:bg-gray-100',
                    ].join(' ')}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-trenord-green' : 'bg-gray-100'
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-trenord-green' : 'text-gray-800'
                        }`}
                      >
                        {station.nome}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{station.codice}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold text-trenord-green bg-trenord-green/10 px-2 py-1 rounded-full flex-shrink-0">
                        Attiva
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};