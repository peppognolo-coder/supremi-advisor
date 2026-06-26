import React from 'react';
import { MapPin, ChevronRight, AlertCircle, Train, Plus, X } from 'lucide-react';
import type { HomeStationData } from '../../hooks/useHomeStation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StazioneCardProps {
  data: HomeStationData | null;
  loading: boolean;
  onApri: () => void;
  onCambia: () => void;
  onRimuovi: () => void;
  /** Chip contatori — navigano verso sezioni specifiche */
  onOpenSalette?: () => void;
  onOpenAttivita?: () => void;
  onOpenHotel?: () => void;
  onOpenProblemi?: () => void;
}

// ---------------------------------------------------------------------------
// Skeleton
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
// Empty state
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
// Chip contatore — diventa button se onClick è fornito
// ---------------------------------------------------------------------------

function CountChip({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/60 mt-0.5">{label}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="bg-white/10 rounded-xl px-3 py-2.5 text-left active:bg-white/20 transition-colors"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="bg-white/10 rounded-xl px-3 py-2.5">
      {inner}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StazioneCard
// ---------------------------------------------------------------------------

export const StazioneCard: React.FC<StazioneCardProps> = ({
  data,
  loading,
  onApri,
  onCambia,
  onRimuovi,
  onOpenSalette,
  onOpenAttivita,
  onOpenHotel,
  onOpenProblemi,
}) => {
  if (loading) return <StazioneCardSkeleton />;
  if (!data) return <StazioneCardEmpty onCambia={onCambia} />;

  const { stazione, counts, problemiAperti } = data;
  const primoProblema = problemiAperti[0] ?? null;
  const altriProblemi = problemiAperti.length - 1;

  // Griglia chip: 2 colonne base, 3 se hotel presente
  const chipCols = counts.hotel > 0 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="mx-4 rounded-2xl bg-trenord-green text-white shadow-lg overflow-hidden">

      {/* ── INTESTAZIONE ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        {/* Label + azioni Cambia / Rimuovi */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
              La tua stazione
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRimuovi}
              className="flex items-center gap-1 text-xs font-medium text-white/50 active:text-white/80 transition-colors"
            >
              <X className="w-3 h-3" />
              Rimuovi
            </button>
            <button
              onClick={onCambia}
              className="text-xs font-semibold text-white/80 active:text-white transition-colors"
            >
              Cambia
            </button>
          </div>
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

      {/* ── BANNER PROBLEMI ───────────────────────────────────────────────── */}
      {primoProblema && (
        <button
          onClick={onOpenProblemi}
          className="mx-4 mb-3 w-[calc(100%-2rem)] px-3 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-300/30 flex items-start gap-2 text-left active:bg-yellow-400/30 transition-colors"
        >
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
        </button>
      )}

      {/* ── CHIP CONTATORI ────────────────────────────────────────────────── */}
      {(counts.salette > 0 || counts.attivita > 0 || counts.hotel > 0) ? (
        <div className={`mx-4 mb-4 grid ${chipCols} gap-2`}>
          <CountChip
            value={counts.salette}
            label={counts.salette === 1 ? 'Saletta' : 'Salette'}
            onClick={onOpenSalette}
          />
          <CountChip
            value={counts.attivita}
            label="Attività"
            onClick={onOpenAttivita}
          />
          {counts.hotel > 0 && (
            <CountChip
              value={counts.hotel}
              label="Hotel"
              onClick={onOpenHotel}
            />
          )}
        </div>
      ) : (
        <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl bg-white/10">
          <p className="text-xs text-white/50 text-center">Nessuna risorsa registrata</p>
        </div>
      )}

      {/* ── CTA PRINCIPALE ────────────────────────────────────────────────── */}
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