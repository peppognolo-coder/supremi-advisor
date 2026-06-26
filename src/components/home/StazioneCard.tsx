import React from 'react';
import { MapPin, ChevronRight, AlertCircle, Train, Plus } from 'lucide-react';
import type { HomeStationData } from '../../hooks/useHomeStation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StazioneCardProps {
  data: HomeStationData | null;
  loading: boolean;
  onApri: () => void;
  /** Apre il SearchOverlay per scegliere una stazione */
  onCambia: () => void;
}

// ---------------------------------------------------------------------------
// Skeleton — mentre carica
// ---------------------------------------------------------------------------

function StazioneCardSkeleton() {
  return (
    <div className="mx-4 rounded-2xl bg-trenord-green overflow-hidden shadow-lg">
      <div className="px-5 pt-5 pb-5 flex flex-col gap-3 animate-pulse">
        <div className="h-3 w-28 rounded-full bg-white/20" />
        <div className="h-7 w-48 rounded-full bg-white/30" />
        <div className="h-3 w-20 rounded-full bg-white/20" />
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="h-14 rounded-xl bg-white/10" />
          <div className="h-14 rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — nessuna stazione selezionata
// ---------------------------------------------------------------------------

function StazioneCardEmpty({ onCambia }: { onCambia: () => void }) {
  return (
    <div className="mx-4 rounded-2xl bg-trenord-green overflow-hidden shadow-lg">
      <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
          <Train className="w-7 h-7 text-white/60" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Nessuna stazione selezionata</p>
          <p className="text-white/60 text-xs mt-1">
            Seleziona la tua stazione per vedere salette, attività e aggiornamenti
          </p>
        </div>
        <button
          onClick={onCambia}
          className="flex items-center gap-2 bg-white text-trenord-green font-semibold text-sm px-4 py-2.5 rounded-xl active:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Seleziona stazione
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StazioneCard principale
// ---------------------------------------------------------------------------

export const StazioneCard: React.FC<StazioneCardProps> = ({
  data,
  loading,
  onApri,
  onCambia,
}) => {
  if (loading) return <StazioneCardSkeleton />;
  if (!data) return <StazioneCardEmpty onCambia={onCambia} />;

  const { stazione, counts, problemiAperti } = data;
  const primoProblema = problemiAperti[0] ?? null;
  const altriProblemi = problemiAperti.length - 1;

  // Totale attività visibili in card (esclude hotel che ha counter separato)
  const totaleRisorse = counts.salette + counts.attivita + counts.hotel;

  return (
    <div className="mx-4 rounded-2xl bg-trenord-green text-white shadow-lg overflow-hidden">
      {/* Intestazione */}
      <div className="px-5 pt-5 pb-4">
        {/* Label + link cambia */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
              La tua stazione
            </span>
          </div>
          <button
            onClick={onCambia}
            className="text-xs font-semibold text-white/60 active:text-white/90 transition-colors"
          >
            Cambia
          </button>
        </div>

        {/* Nome stazione */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-white truncate">
              {stazione.nome}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-white/60 font-mono">{stazione.codice}</span>
              {stazione.regione && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-sm text-white/60">{stazione.regione}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Train className="w-6 h-6 text-white/80" />
          </div>
        </div>
      </div>

      {/* Banner problema aperto — solo se presente */}
      {primoProblema && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-300/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-200 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-yellow-100">{primoProblema.tipo}</p>
            {primoProblema.nota && (
              <p className="text-xs text-yellow-100/80 truncate mt-0.5">{primoProblema.nota}</p>
            )}
            {altriProblemi > 0 && (
              <p className="text-xs text-yellow-100/60 mt-0.5">
                +{altriProblemi} altro{altriProblemi > 1 ? 'i' : ''} problem{altriProblemi > 1 ? 'i' : 'a'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Statistiche */}
      {totaleRisorse > 0 ? (
        <div
          className={`mx-4 mb-4 grid gap-2 ${
            counts.hotel > 0 ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          <div className="bg-white/10 rounded-xl px-3 py-2.5">
            <p className="text-xl font-bold text-white">{counts.salette}</p>
            <p className="text-xs text-white/60 mt-0.5">
              {counts.salette === 1 ? 'Saletta' : 'Salette'}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2.5">
            <p className="text-xl font-bold text-white">{counts.attivita}</p>
            <p className="text-xs text-white/60 mt-0.5">Attività</p>
          </div>
          {counts.hotel > 0 && (
            <div className="bg-white/10 rounded-xl px-3 py-2.5">
              <p className="text-xl font-bold text-white">{counts.hotel}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {counts.hotel === 1 ? 'Hotel' : 'Hotel'}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Stazione senza risorse ancora caricate
        <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl bg-white/10">
          <p className="text-xs text-white/50 text-center">Nessuna risorsa registrata</p>
        </div>
      )}

      {/* CTA principale */}
      <button
        onClick={onApri}
        className="w-full flex items-center justify-between px-5 py-4 bg-white/10 border-t border-white/10 active:bg-white/20 transition-colors"
      >
        <span className="text-sm font-semibold text-white">Apri stazione</span>
        <ChevronRight className="w-4 h-4 text-white/70" />
      </button>
    </div>
  );
};