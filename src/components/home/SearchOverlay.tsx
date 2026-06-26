import React, { useEffect, useRef } from 'react';
import { Search, X, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { useStationSearch } from '../../hooks/useStationSearch';
import { useScrollLock } from '../../lib/useScrollLock';

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
// SearchOverlay — schermata modale fullscreen
//
// Architettura:
//   fixed inset-0          → occupa TUTTO il viewport (no bottom-sheet)
//   flex flex-col          → layout verticale rigido
//   header   flex-shrink-0 → altezza fissa, non comprime
//   searchbar flex-shrink-0→ altezza fissa, non comprime
//   lista    flex-1        → occupa tutto lo spazio RIMANENTE
//            overflow-y-auto → scorribile internamente
//
// iOS Safari:
//   - inset-0 ancorato al layout viewport → stabile con tastiera aperta
//   - La lista scrolla dentro il pannello, non il body
//   - input font-size 16px → nessun auto-zoom
//   - inputMode="search" → tastiera ottimizzata
//
// Android Chrome:
//   - inset-0 si adatta al visual viewport ridotto dalla tastiera
//   - La lista risultati rimane sopra la tastiera perché è flex-1 bounded
//
// Scroll lock:
//   - document.body overflow-hidden mentre aperto → nessun body scroll
//   - modalOpenCount incrementato → disabilita pull-to-refresh di App.tsx
// ---------------------------------------------------------------------------

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  onSelectStation,
  activeStationId,
}) => {
  const { query, setQuery, results, loadingAll, reset } = useStationSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  // useScrollLock gestisce body overflow + modalOpenCount (pull-to-refresh).
  // Il componente monta solo quando isOpen=true (App.tsx usa `isOpen && <SearchOverlay>`
  // tramite il conditional render), quindi il lock è attivo per tutta la vita del mount.
  useScrollLock();

  // ── Focus automatico ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Delay per attendere che l'animazione CSS sia terminata
      // e che iOS abbia processato il mount del componente
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      reset();
    }
  }, [isOpen, reset]);

  // ── ESC da tastiera hardware ───────────────────────────────────────────────
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
    // Fullscreen — z-[60] supera TabBar (z-50) e qualsiasi altro fixed element
    <div
      className="fixed inset-0 z-[60] bg-white flex flex-col"
      style={{ height: '100dvh' }}
    >
      {/* ── HEADER fisso ────────────────────────────────────────────────────
          Padding top safe area → gestisce notch e Dynamic Island
      ── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-100"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 active:bg-gray-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex-1">Cambia stazione</h2>
        </div>

        {/* ── BARRA DI RICERCA fissa ──────────────────────────────────────
            font-size 16px (text-base) → nessun auto-zoom Safari iOS
            inputMode="search" → tastiera ottimizzata con tasto invio/cerca
            autoComplete/Correct/Capitalize off → niente suggerimenti invasivi
        ── */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome o codice…"
              className="flex-1 bg-transparent text-base placeholder:text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
            />
            {query ? (
              <button
                // preventDefault evita blur dell'input su tap mobile
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => setQuery('')}
                className="text-gray-400 active:text-gray-600 p-1 -m-1"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── LISTA RISULTATI scrollabile ─────────────────────────────────────
          flex-1 → occupa TUTTO lo spazio tra header e fine schermo
          overflow-y-auto → scrolla internamente, mai il body
          overscroll-behavior: contain → nessun bounce propagato
          padding-bottom safe area → ultimo elemento visibile sopra home bar
      ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          overscrollBehavior: 'contain',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {loadingAll ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-trenord-green border-t-transparent animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Nessuna stazione trovata</p>
            <p className="text-xs text-gray-400 mt-1">Prova con un nome o codice diverso</p>
          </div>
        ) : (
          <div className="px-4 pt-2">
            {!query && (
              <p className="text-xs font-medium text-gray-400 mb-3 mt-1 uppercase tracking-wide">
                Stazioni disponibili
              </p>
            )}
            {query && (
              <p className="text-xs font-medium text-gray-400 mb-3 mt-1">
                {results.length} {results.length === 1 ? 'risultato' : 'risultati'}
              </p>
            )}
            <div className="flex flex-col gap-1 pb-4">
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
                        : 'active:bg-gray-100',
                    ].join(' ')}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{station.codice}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold text-trenord-green bg-trenord-green/10 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                        Attiva
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};