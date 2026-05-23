import {
  getStatoApertura,
} from './getStatoApertura';

// =========================
// TIPI
// =========================

export type SortMode =
  | 'aperte'
  | 'convenzionate'
  | 'rating'
  | 'distanza';

export interface SortOption {

  mode: SortMode;

  label: string;

  emoji: string;
}

// =========================
// OPZIONI UI
// =========================

export const SORT_OPTIONS: SortOption[] = [

  {
    mode: 'aperte',
    label: 'Aperte ora',
    emoji: '🟢',
  },

  {
    mode: 'convenzionate',
    label: 'Convenzionate',
    emoji: '✅',
  },

  {
    mode: 'rating',
    label: 'Miglior rating',
    emoji: '⭐',
  },

  {
    mode: 'distanza',
    label: 'Distanza',
    emoji: '🚶',
  },

];

// =========================
// HELPERS
// =========================

/**
 * Mappa distanza_piedi (stringa)
 * a un rank numerico per l'ordinamento.
 * Minore = più vicino.
 */
function distanzaRank(
  distanza_piedi: string | null | undefined
): number {

  switch (distanza_piedi) {

    case 'Entro 2 minuti':
      return 1;

    case 'Entro 5 minuti':
      return 2;

    case 'Entro 10 minuti':
      return 3;

    case 'Oltre 10 minuti':
      return 4;

    default:
      return 99;
  }
}

/**
 * Calcola la media voti di un'attività.
 * Compatibile con entrambe le strutture:
 * - valutazioni: { voto }[]   (StazioniScreen)
 * - assenza del campo         (StazioneCard)
 */
function mediaRating(
  attivita: any
): number {

  const vals: any[] =
    Array.isArray(attivita?.valutazioni)
      ? attivita.valutazioni
      : [];

  if (vals.length === 0) {
    return 0;
  }

  return (
    vals.reduce(
      (sum: number, v: any) =>
        sum + (v?.voto ?? 0),
      0
    ) / vals.length
  );
}

// =========================
// UTILITY PRINCIPALE
// =========================

/**
 * Ordina un array di attività
 * secondo il criterio scelto.
 * Non modifica l'array originale.
 *
 * @param attivita  - lista attività da ordinare
 * @param mode      - criterio di ordinamento
 * @returns nuovo array ordinato
 *
 * @example
 * const sorted = sortAttivita(locali, 'aperte');
 * const sorted = sortAttivita(locali, 'rating');
 */
export function sortAttivita(
  attivita: any[],
  mode: SortMode
): any[] {

  const arr = [...attivita];

  switch (mode) {

    // =========================
    // APERTE ORA
    // Aperte prima, poi chiuse.
    // A parità: ordine alfabetico.
    // =========================

    case 'aperte': {

      return arr.sort(
        (a, b) => {

          const aAperto =
            getStatoApertura(a).aperto
              ? 0
              : 1;

          const bAperto =
            getStatoApertura(b).aperto
              ? 0
              : 1;

          if (aAperto !== bAperto) {
            return aAperto - bAperto;
          }

          return (
            a.nome ?? ''
          ).localeCompare(
            b.nome ?? '',
            'it'
          );
        }
      );
    }

    // =========================
    // CONVENZIONATE PRIMA
    // Convenzionate prima, poi le altre.
    // A parità: ordine alfabetico.
    // =========================

    case 'convenzionate': {

      return arr.sort(
        (a, b) => {

          const aConv =
            a.convenzionato ? 0 : 1;

          const bConv =
            b.convenzionato ? 0 : 1;

          if (aConv !== bConv) {
            return aConv - bConv;
          }

          return (
            a.nome ?? ''
          ).localeCompare(
            b.nome ?? '',
            'it'
          );
        }
      );
    }

    // =========================
    // MIGLIOR RATING
    // Media voti decrescente.
    // Senza voti: in fondo, poi alfabetico.
    // =========================

    case 'rating': {

      return arr.sort(
        (a, b) => {

          const aRating =
            mediaRating(a);

          const bRating =
            mediaRating(b);

          if (bRating !== aRating) {
            return bRating - aRating;
          }

          return (
            a.nome ?? ''
          ).localeCompare(
            b.nome ?? '',
            'it'
          );
        }
      );
    }

    // =========================
    // DISTANZA
    // Più vicino prima.
    // A parità o assenza: alfabetico.
    // =========================

    case 'distanza': {

      return arr.sort(
        (a, b) => {

          const aRank =
            distanzaRank(
              a.distanza_piedi
            );

          const bRank =
            distanzaRank(
              b.distanza_piedi
            );

          if (aRank !== bRank) {
            return aRank - bRank;
          }

          return (
            a.nome ?? ''
          ).localeCompare(
            b.nome ?? '',
            'it'
          );
        }
      );
    }

    default:
      return arr;
  }
}