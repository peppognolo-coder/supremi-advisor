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
  // true quando il gesto corrente è stato classificato come "non pull-down"
  // (scroll verso l'alto, orizzontale, o scrollTop > 0 al primo movimento
  // significativo). Impedisce di rivalutare lo stesso gesto ad ogni frame.
  // Resettato solo in onTouchStart.
  const gestureRejected = useRef(false);

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

    function onTouchStart(e: TouchEvent) {
      // onTouchStart NON arma il PTR.
      // Si limita a salvare la posizione iniziale del dito e azzerare lo
      // stato: è onTouchMove che decide se il gesto è un pull-down.
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      currentY.current = e.touches[0].clientY;
      pulling.current = false;
      directionLocked.current = false;
      gestureRejected.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - startY.current;
      const deltaX = touchX - startX.current;

      if (!pulling.current) {
        // ── Fase di riconoscimento ────────────────────────────────────────
        // Se il gesto è già stato classificato come "non pull-down",
        // ignoralo fino al prossimo touchstart. L'intenzione era già
        // evidente al primo movimento significativo: non la rivalutiamo.
        if (gestureRejected.current) return;

        const movedEnough =
          Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!movedEnough) return; // troppo poco movimento, aspetta ancora

        // Da qui in poi il movimento è significativo: classifichiamo il
        // gesto una volta sola e non cambiamo idea fino al prossimo touch.

        if (getScrollPosition(target) > 0) {
          // Contenitore non in cima: è uno scroll, non un pull-down.
          gestureRejected.current = true;
          return;
        }
        if (deltaY <= 0) {
          // Gesto verso l'alto: non è un pull-down.
          gestureRejected.current = true;
          return;
        }
        if (Math.abs(deltaX) >= deltaY) {
          // Gesto troppo orizzontale: non è un pull-down.
          gestureRejected.current = true;
          return;
        }

        // Tutte le condizioni soddisfatte: armo e direction-lock insieme.
        pulling.current = true;
        directionLocked.current = true;

        // Previene il rubber-band/back-navigation nativo ora che il gesto
        // è confermato come pull-down intenzionale.
        if (e.cancelable) e.preventDefault();

        currentY.current = touchY;
        return;
        // ─────────────────────────────────────────────────────────────────
      }

      // ── Fase di tracking (pulling=true, directionLocked=true) ──────────
      // Il pull è già confermato. Aggiorniamo la posizione corrente e
      // annulliamo solo se il contenitore è tornato a scrollare (inerzia).

      if (getScrollPosition(target) > 5) {
        // Il contenitore ha ripreso a scrollare: non siamo più in cima.
        // Annulliamo il pull senza triggerare il refresh.
        pulling.current = false;
        directionLocked.current = false;
        gestureRejected.current = true; // il gesto è compromesso, ignoralo
        return;
      }

      if (e.cancelable) e.preventDefault();
      currentY.current = touchY;
    }

    function onTouchEnd() {
      console.log('[PTR] touchend', {
        pulling: pulling.current,
        distance: Math.round(currentY.current - startY.current),
        scrollTop: getScrollPosition(target),
      });

      if (!pulling.current) return;

      const distance = currentY.current - startY.current;

      if (
        distance > threshold &&
        directionLocked.current &&
        getScrollPosition(target) <= 0 &&
        !isRefreshingRef.current
      ) {
        console.log('[PTR] REFRESH TRIGGERED', { distance, threshold });
        isRefreshingRef.current = true;
        setIsRefreshing(true);

        onRefreshRef.current();

        setTimeout(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }, 1200);
      }

      pulling.current = false;
      directionLocked.current = false;
      gestureRejected.current = false;
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
    };
    // `target` può essere `window` (stabile) o un RefObject (stabile come
    // identità dell'oggetto ref, anche se `.current` cambia). `onRefresh`
    // è gestito tramite `onRefreshRef` per non dover essere una dipendenza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, threshold]);

  return { isRefreshing };
}