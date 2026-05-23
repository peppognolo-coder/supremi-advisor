// =========================
// TIPI
// =========================

export interface FasciaOraria {
  giorni: string[];
  apertura: string;
  chiusura: string;
}

export interface StatoApertura {
  aperto: boolean;
  testo: string;
}

// =========================
// COSTANTI
// =========================

// Ordine uguale a Date.getDay() con domenica spostata in fondo
// per corrispondere alla convenzione del sistema (Lun=0...Dom=6)
const GIORNI_SETTIMANA: string[] = [
  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
  'Dom',
];

// =========================
// HELPERS
// =========================

/**
 * Converte una stringa orario "HH:MM"
 * in minuti dall'inizio della giornata.
 * Restituisce null se il formato è invalido.
 */
function parseMinuti(
  orario: string | null | undefined
): number | null {

  if (
    !orario ||
    typeof orario !== 'string' ||
    !orario.includes(':')
  ) {
    return null;
  }

  const [hStr, mStr] =
    orario.split(':');

  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) {
    return null;
  }

  return h * 60 + m;
}

/**
 * Restituisce l'indice 0–6 del giorno corrente
 * dove 0 = Lunedì, 6 = Domenica
 * (Date.getDay() usa 0 = Domenica, quindi va rimappato)
 */
function oggiIndice(): number {

  const jsDay = new Date().getDay();

  // js: 0=Dom 1=Lun 2=Mar 3=Mer 4=Gio 5=Ven 6=Sab
  // ns: 0=Lun 1=Mar 2=Mer 3=Gio 4=Ven 5=Sab 6=Dom
  return jsDay === 0
    ? 6
    : jsDay - 1;
}

// =========================
// UTILITY PRINCIPALE
// =========================

/**
 * Calcola se un'attività è aperta ora
 * in base alle sue fasce_orarie.
 *
 * @example
 * getStatoApertura(attivita)
 * // { aperto: true,  testo: "Chiude alle 22:00" }
 * // { aperto: false, testo: "Riapre domani alle 06:00" }
 * // { aperto: false, testo: "Orari non disponibili" }
 */
export function getStatoApertura(
  attivita: { fasce_orarie?: any }
): StatoApertura {

  const fasce: FasciaOraria[] =
    Array.isArray(
      attivita?.fasce_orarie
    )
      ? attivita.fasce_orarie
      : [];

  if (fasce.length === 0) {

    return {
      aperto: false,
      testo: 'Orari non disponibili',
    };
  }

  const now = new Date();
  const oggiIdx = oggiIndice();
  const oggiLabel = GIORNI_SETTIMANA[oggiIdx];
  const oraCorrente =
    now.getHours() * 60 +
    now.getMinutes();

  // =========================
  // 1. VERIFICA SE APERTO ORA
  // =========================

  for (const fascia of fasce) {

    const giorni = Array.isArray(
      fascia.giorni
    )
      ? fascia.giorni
      : [];

    if (!giorni.includes(oggiLabel)) {
      continue;
    }

    const ap = parseMinuti(fascia.apertura);
    const ch = parseMinuti(fascia.chiusura);

    if (ap === null || ch === null) {
      continue;
    }

    // Orario notturno (es. 22:00 → 02:00)
    if (ch < ap) {

      if (
        oraCorrente >= ap ||
        oraCorrente < ch
      ) {
        return {
          aperto: true,
          testo: `Chiude alle ${fascia.chiusura}`,
        };
      }

    } else {

      if (
        oraCorrente >= ap &&
        oraCorrente < ch
      ) {
        return {
          aperto: true,
          testo: `Chiude alle ${fascia.chiusura}`,
        };
      }
    }
  }

  // =========================
  // 2. PROSSIMA APERTURA OGGI
  // =========================

  const fasceOggi = fasce
    .filter((f) => {

      const giorni = Array.isArray(f.giorni)
        ? f.giorni
        : [];

      return giorni.includes(oggiLabel);
    })
    .filter((f) => {

      const ap = parseMinuti(f.apertura);

      return ap !== null && ap > oraCorrente;
    })
    .sort((a, b) => {

      return (
        (parseMinuti(a.apertura) ?? 9999) -
        (parseMinuti(b.apertura) ?? 9999)
      );
    });

  if (fasceOggi.length > 0) {

    return {
      aperto: false,
      testo: `Riapre oggi alle ${fasceOggi[0].apertura}`,
    };
  }

  // =========================
  // 3. PROSSIMA APERTURA
  //    NEI PROSSIMI 6 GIORNI
  // =========================

  for (
    let delta = 1;
    delta <= 6;
    delta++
  ) {

    const futuroIdx =
      (oggiIdx + delta) % 7;

    const futuroLabel =
      GIORNI_SETTIMANA[futuroIdx];

    const fasceGiorno = fasce
      .filter((f) => {

        const giorni = Array.isArray(
          f.giorni
        )
          ? f.giorni
          : [];

        return (
          giorni.includes(futuroLabel) &&
          parseMinuti(f.apertura) !== null
        );
      })
      .sort((a, b) => {

        return (
          (parseMinuti(a.apertura) ?? 9999) -
          (parseMinuti(b.apertura) ?? 9999)
        );
      });

    if (fasceGiorno.length > 0) {

      const primaFascia = fasceGiorno[0];

      const labelGiorno =
        delta === 1
          ? 'domani'
          : futuroLabel;

      return {
        aperto: false,
        testo: `Riapre ${labelGiorno} alle ${primaFascia.apertura}`,
      };
    }
  }

  // =========================
  // 4. NESSUNA RIAPERTURA
  //    TROVATA
  // =========================

  return {
    aperto: false,
    testo: 'Chiuso',
  };
}