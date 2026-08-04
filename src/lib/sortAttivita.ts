import {
  getStatoApertura,
} from './getStatoApertura';

// =========================
// TIPI
// =========================

/**
 * Filtri booleani combinabili tra loro (logica "e"): a differenza
 * dell'ordinamento, nascondono le attività che non soddisfano la
 * condizione. Entrambi possono essere attivi insieme (es. "aperta e
 * convenzionata"). Vedi conversazione.
 */
export interface FiltriAttivita {
  aperte: boolean;
  convenzionate: boolean;
}

export const FILTRI_DEFAULT: FiltriAttivita = {
  aperte: false,
  convenzionate: false,
};

/**
 * Ordinamento puro: non nasconde nulla, riordina soltanto. Un solo
 * criterio alla volta (o nessuno = ordine alfabetico neutro).
 * "Aperte ora" e "Convenzionate" sono stati spostati tra i FILTRI
 * (FiltriAttivita) perché sono condizioni sì/no con una soglia naturale;
 * qui restano solo i criteri senza soglia (rating, distanza). Vedi
 * conversazione.
 */
export type Ordinamento =
  | 'rating'
  | 'distanza'
  | null;

export interface FiltroOption {
  key: keyof FiltriAttivita;
  label: string;
  emoji: string;
}

export interface OrdinamentoOption {
  mode: Exclude<Ordinamento, null>;
  label: string;
  emoji: string;
}

// =========================
// OPZIONI UI
// =========================

export const FILTRI_OPTIONS: FiltroOption[] = [

  {
    key: 'aperte',
    label: 'Aperte ora',
    emoji: '🟢',
  },

  {
    key: 'convenzionate',
    label: 'Convenzionate',
    emoji: '✅',
  },

];

export const ORDINAMENTO_OPTIONS: OrdinamentoOption[] = [

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

    case 'In stazione':
      return 0;

    case 'Entro 2 minuti a piedi':
      return 1;

    case 'Entro 5 minuti a piedi':
      return 2;

    case 'Entro 10 minuti a piedi':
      return 3;

    case 'Oltre 10 minuti a piedi':
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

function confrontoAlfabetico(
  a: any,
  b: any
): number {

  return (
    a.nome ?? ''
  ).localeCompare(
    b.nome ?? '',
    'it'
  );
}

// =========================
// FILTRO (nasconde le non corrispondenti)
// =========================

/**
 * Filtra un array di attività secondo i filtri booleani attivi
 * (combinati con logica "e"). Non modifica l'array originale.
 *
 * @example
 * const visibili = filtraAttivita(locali, { aperte: true, convenzionate: false });
 */
export function filtraAttivita(
  attivita: any[],
  filtri: FiltriAttivita
): any[] {

  return attivita.filter((a) => {

    if (filtri.aperte && !getStatoApertura(a).aperto) {
      return false;
    }

    if (filtri.convenzionate && !a.convenzionato) {
      return false;
    }

    return true;
  });
}

// =========================
// ORDINAMENTO (riordina soltanto, non nasconde nulla)
// =========================

/**
 * Ordina un array di attività secondo il criterio scelto.
 * Non modifica l'array originale. Con `null` (nessun criterio
 * selezionato, stato neutro) ordina alfabeticamente.
 *
 * @example
 * const ordinate = ordinaAttivita(locali, 'rating');
 * const ordinate = ordinaAttivita(locali, null); // neutro → alfabetico
 */
export function ordinaAttivita(
  attivita: any[],
  ordinamento: Ordinamento
): any[] {

  const arr = [...attivita];

  switch (ordinamento) {

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

          return confrontoAlfabetico(a, b);
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

          return confrontoAlfabetico(a, b);
        }
      );
    }

    // =========================
    // NEUTRO (nessun criterio selezionato)
    // Ordine alfabetico: prevedibile, coerente col
    // criterio di pareggio già usato sopra.
    // =========================

    default:
      return arr.sort(confrontoAlfabetico);
  }
}
