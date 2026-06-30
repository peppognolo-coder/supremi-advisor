/**
 * usePullToRefresh
 *
 * Hook generico per gestire il gesto di "pull-to-refresh" (trascina verso
 * il basso per aggiornare) su un qualsiasi elemento scrollabile, oppure
 * sull'intera finestra.
 *
 * Caratteristiche:
 * - Non conosce nulla del resto dell'app: non sa cosa sia Home, Salette,
 *   Stazioni, l'activeTab, i modali o il SearchOverlay.
 * - Non usa stato globale: tutto lo stato interno (posizione del touch,
 *   direzione del gesto, refresh in corso) vive in ref/state locali
 *   all'istanza dell'hook. Due componenti diversi che usano l'hook non
 *   condividono nulla tra loro.
 * - Si limita a invocare `onRefresh()` quando il gesto supera la soglia.
 *   Cosa fa `onRefresh` (incrementare un contatore, mostrare un toast,
 *   pilotare un indicatore globale) è responsabilità di chi chiama
 *   l'hook, non dell'hook stesso.
 *
 * Target supportati:
 * - `window`                        → per le schermate con scroll del body
 *   (Salette, Stazioni, Contributi, Segnalazioni, Admin)
 * - `RefObject<HTMLElement>`         → per le schermate con un contenitore
 *   scrollabile interno (es. la Home, che usa un div overflow-y-auto)
 *
 * L'hook tratta i due casi in modo identico: l'unica differenza è come si
 * legge lo scroll corrente (`window.scrollY` vs `el.scrollTop`) e dove si
 * registrano i listener (`window` vs l'elemento).
 *
 * Uso tipico:
 *
 *   // Schermata con scroll sul body (window)
 *   usePullToRefresh({ target: window, onRefresh: handleRefresh });
 *
 *   // Schermata con contenitore scrollabile interno
 *   const scrollRef = useRef<HTMLDivElement>(null);
 *   usePullToRefresh({ target: scrollRef, onRefresh: handleRefresh });
 *   // ...
 *   <div ref={scrollRef} className="overflow-y-auto h-full">...</div>
 */

import { useEffect, useRef, useState } from 'react';

// Soglia di attivazione, in pixel. Sotto questa distanza il pull
// viene considerato uno scroll normale e non un gesto di refresh.
const DEFAULT_THRESHOLD = 140;

// Distanza minima, in pixel, prima di "bloccare" la direzione del gesto
// come verticale o orizzontale. Evita falsi positivi su piccoli movimenti.
const DIRECTION_LOCK_PX = 20;

type PullToRefreshTarget = Window | React.RefObject<HTMLElement>;

interface UsePullToRefreshOptions {
  /** L'elemento da cui ascoltare il gesto: `window`, oppure un RefObject
   *  che punta a un elemento scrollabile (es. uno scrollRef della Home). */
  target: PullToRefreshTarget;
  /** Callback invocata quando il gesto supera la soglia. L'hook non sa
   *  (e non deve sapere) cosa fa questa funzione: può aggiornare dati,
   *  mostrare un toast, pilotare uno stato globale, ecc. */
  onRefresh: () => void;
  /** Disattiva temporaneamente il pull-to-refresh senza smontare l'hook.
   *  Default: true. */
  enabled?: boolean;
  /** Soglia di attivazione in pixel. Default: 90. */
  threshold?: number;
}

interface UsePullToRefreshResult {
  /** true mentre il refresh innescato da questo hook è considerato "in
   *  corso" (vedi nota sotto su come viene calcolato). Utile se la
   *  singola schermata vuole mostrare un proprio indicatore locale,
   *  in aggiunta o in alternativa a un indicatore globale gestito altrove. */
  isRefreshing: boolean;
}

/** Risolve l'elemento DOM reale da cui leggere lo scroll e su cui
 *  registrare i listener, a partire da un target Window o RefObject. */
function resolveElement(target: PullToRefreshTarget): HTMLElement | Window | null {
  if (target instanceof Window) return target;
  // È un RefObject: l'elemento può non essere ancora montato.
  return target.current;
}

function getScrollPosition(target: PullToRefreshTarget): number {
  if (target instanceof Window) {
    return window.scrollY || document.documentElement.scrollTop;
  }
  return target.current?.scrollTop ?? 0;
}

export function usePullToRefresh({
  target,
  onRefresh,
  enabled = true,
  threshold = DEFAULT_THRESHOLD,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stato del gesto in corso — tutto locale a questa istanza dell'hook.
  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const directionLocked = useRef(false);

  // Mirror ref per "refresh in corso": letto dalla closure dei listener
  // senza dover dipendere da `isRefreshing` (state) nelle dipendenze del
  // useEffect, così i listener vengono registrati una volta sola.
  const isRefreshingRef = useRef(false);

  // onRefresh può cambiare identità tra un render e l'altro (è una
  // funzione passata dal chiamante): la teniamo in un ref aggiornato
  // ad ogni render, così il useEffect sotto può avere dipendenze
  // stabili senza richiamare onRefresh "stale".
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const el = resolveElement(target);
    if (!el) return; // RefObject non ancora montato: niente da fare.

    // ── GUARDIA TEMPORALE ─────────────────────────────────────────────────
    // Il PTR si arma solo se scrollTop === 0 E il contenitore è rimasto
    // stabile in cima per almeno STABLE_TOP_MS millisecondi senza eventi
    // scroll nel frattempo. Previene il falso armo durante lo scroll
    // inerziale (momentum) su div overflow-y: auto (es. Home), dove il
    // browser porta scrollTop a 0 ancora prima che il dito si fermi.
    const STABLE_TOP_MS = 120;
    let lastScrollTime = 0; // timestamp dell'ultimo evento scroll

    function onScroll() {
      lastScrollTime = performance.now();
      const sp = getScrollPosition(target);
      console.log('[PTR] scroll', { scrollTop: sp, time: lastScrollTime.toFixed(1) });
    }
    el.addEventListener('scroll', onScroll as EventListener, { passive: true });
    // ─────────────────────────────────────────────────────────────────────

    function onTouchStart(e: TouchEvent) {
      const sp = getScrollPosition(target);
      const now = performance.now();
      const msSinceLastScroll = now - lastScrollTime;
      const stableAtTop = sp <= 0 && msSinceLastScroll >= STABLE_TOP_MS;

      console.log('[PTR] touchstart', {
        time: now.toFixed(1),
        scrollTop: sp,
        msSinceLastScroll: Math.round(msSinceLastScroll),
        armed: stableAtTop,
      });

      // Attiva il possibile pull solo se siamo in cima E il contenitore
      // è rimasto fermo lì per almeno STABLE_TOP_MS ms senza scroll.
      if (!stableAtTop) return;

      console.log('[PTR] ARMED', {
        time: now.toFixed(1),
        scrollTop: sp,
        msSinceLastScroll: Math.round(msSinceLastScroll),
      });

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      currentY.current = e.touches[0].clientY;
      pulling.current = true;
      directionLocked.current = false;
    }

    // Throttle per touchmove: logga solo quando deltaY cambia di ≥5px
    let lastLoggedDeltaY = 0;

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - startY.current;
      const deltaX = touchX - startX.current;

      // Log throttolato: solo variazioni significative, evita spam
      if (Math.abs(deltaY - lastLoggedDeltaY) >= 5) {
        console.log('[PTR] touchmove', {
          deltaY: Math.round(deltaY),
          scrollTop: getScrollPosition(target),
          dirLocked: directionLocked.current,
        });
        lastLoggedDeltaY = deltaY;
      }

      // Se siamo già scrollati oltre la cima, nessun pull è in corso:
      // lasciamo il gesto al comportamento nativo del browser/scroll.
      const atTop = getScrollPosition(target) <= 0;

      if (!directionLocked.current) {
        // FIX: durante i primi pixel di movimento (prima che il
        // direction-lock scatti a DIRECTION_LOCK_PX), il gesto è ancora
        // ambiguo ma se siamo in cima e il movimento è già chiaramente
        // più verticale-verso-il-basso che orizzontale, preveniamo subito
        // il comportamento nativo (rubber-band / back-navigation gesture).
        // Senza questo, su gesti rapidi il browser decide di intercettare
        // il touch come "indietro" prima che il lock si stabilizzi,
        // causando un ritorno alla schermata precedente invece del
        // refresh — più frequente sulle schermate con contenuto corto
        // (sempre a scrollY/scrollTop 0), come la vista di selezione di
        // ContributiScreen.
        if (atTop && deltaY > 0 && deltaY >= Math.abs(deltaX)) {
          if (e.cancelable) e.preventDefault();
        }

        const movedEnough =
          Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!movedEnough) return;

        // Gesto orizzontale: non è un pull-to-refresh, abbandona.
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          pulling.current = false;
          return;
        }
        // Gesto verso l'alto: non è un pull-to-refresh, abbandona.
        if (deltaY < 0) {
          pulling.current = false;
          return;
        }
        directionLocked.current = true;
      }

      // Se nel frattempo il contenitore ha scrollato (es. inerzia),
      // annulla il pull: non siamo più "in cima".
      if (getScrollPosition(target) > 5) {
        pulling.current = false;
        directionLocked.current = false;
        return;
      }

      // Blocca il comportamento nativo del browser (rubber-band /
      // back-navigation gesture) per tutta la durata del pull confermato.
      if (directionLocked.current && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
      }

      currentY.current = touchY;
    }

    function onTouchEnd() {
      console.log('[PTR] touchend', {
        time: performance.now().toFixed(1),
        pulling: pulling.current,
        distance: Math.round(currentY.current - startY.current),
        scrollTop: getScrollPosition(target),
      });
      lastLoggedDeltaY = 0; // reset throttle per il prossimo gesto

      if (!pulling.current) return;

      const distance = currentY.current - startY.current;

      if (
        distance > threshold &&
        directionLocked.current &&
        getScrollPosition(target) <= 0 &&
        !isRefreshingRef.current
      ) {
        console.log('[PTR] THRESHOLD PASSED', {
          distance: Math.round(distance),
          threshold,
          scrollTop: getScrollPosition(target),
        });
        console.log('[PTR] → REFRESH TRIGGERED', { distance, threshold });
        isRefreshingRef.current = true;
        setIsRefreshing(true);

        onRefreshRef.current();

        // L'hook non sa quanto dura il refresh del chiamante (può essere
        // sincrono o asincrono): usiamo un piccolo timeout per evitare
        // trigger multipli ravvicinati, coerente con l'UX attuale.
        setTimeout(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }, 1200);
      }

      pulling.current = false;
      directionLocked.current = false;
      startY.current = 0;
      startX.current = 0;
      currentY.current = 0;
    }

    el.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', onTouchMove as EventListener, { passive: false });
    el.addEventListener('touchend', onTouchEnd as EventListener);

    return () => {
      el.removeEventListener('touchstart', onTouchStart as EventListener);
      el.removeEventListener('touchmove', onTouchMove as EventListener);
      el.removeEventListener('touchend', onTouchEnd as EventListener);
      el.removeEventListener('scroll', onScroll as EventListener);
    };
    // `target` può essere `window` (stabile) o un RefObject (stabile come
    // identità dell'oggetto ref, anche se `.current` cambia). `onRefresh`
    // è gestito tramite `onRefreshRef` per non dover essere una dipendenza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, threshold]);

  return { isRefreshing };
}