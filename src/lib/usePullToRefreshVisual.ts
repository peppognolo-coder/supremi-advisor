/**
 * usePullToRefreshVisual
 *
 * Hook "di sola vista" che traccia la distanza di trascinamento durante
 * un gesto di pull verso il basso, per offrire feedback visivo (il
 * contenuto che segue il dito, smorzato, con uno snap-back al rilascio).
 *
 * Deliberatamente separato da usePullToRefresh: quell'hook resta l'unica
 * fonte di verità su quando un refresh deve scattare (soglia, direction
 * lock, prevenzione del rubber-band nativo) e non viene toccato da
 * questo file. usePullToRefreshVisual si limita a osservare lo stesso
 * tipo di gesto per produrre un numero (la traslazione in pixel) che il
 * componente può applicare a un wrapper con `transform: translateY(...)`.
 *
 * Non comunica in alcun modo con usePullToRefresh: i due hook ascoltano
 * lo stesso target in parallelo, in modo indipendente. Questo significa
 * che la soglia di refresh effettiva resta governata solo da
 * usePullToRefresh; questo hook esiste solo per l'estetica del gesto.
 *
 * Uso tipico, accanto a usePullToRefresh:
 *
 *   usePullToRefresh({ target: window, onRefresh: handleRefresh });
 *   const { pullDistance, isReleasing } = usePullToRefreshVisual({ target: window });
 *
 *   <div style={{
 *     transform: `translateY(${pullDistance}px)`,
 *     transition: isReleasing ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
 *   }}>
 *     ...contenuto della schermata...
 *   </div>
 */

import { useEffect, useRef, useState } from 'react';

// Smorzamento: oltre questo punto il movimento del dito si traduce in
// una traslazione via via più piccola (effetto "elastico").
const RESISTANCE_START_PX = 60;
const RESISTANCE_FACTOR = 0.4;

// Traslazione massima visibile, per evitare che il contenuto scappi
// troppo in basso su pull molto lunghi.
const MAX_VISUAL_OFFSET_PX = 80;

const DIRECTION_LOCK_PX = 20;

type PullToRefreshTarget = Window | React.RefObject<HTMLElement>;

interface UsePullToRefreshVisualOptions {
  /** Stesso target passato a usePullToRefresh per la stessa schermata. */
  target: PullToRefreshTarget;
  enabled?: boolean;
}

interface UsePullToRefreshVisualResult {
  /** Traslazione corrente in pixel, da applicare come translateY. */
  pullDistance: number;
  /** true durante l'animazione di rientro dopo il rilascio del dito:
   *  il componente può usarlo per attivare una transition CSS. */
  isReleasing: boolean;
}

function resolveElement(target: PullToRefreshTarget): HTMLElement | Window | null {
  if (target instanceof Window) return target;
  return target.current;
}

function getScrollPosition(target: PullToRefreshTarget): number {
  if (target instanceof Window) {
    return window.scrollY || document.documentElement.scrollTop;
  }
  return target.current?.scrollTop ?? 0;
}

/** Applica resistenza progressiva oltre RESISTANCE_START_PX, così il
 *  contenuto rallenta invece di seguire il dito 1:1 su pull lunghi. */
function applyResistance(rawDelta: number): number {
  if (rawDelta <= RESISTANCE_START_PX) return rawDelta;
  const extra = (rawDelta - RESISTANCE_START_PX) * RESISTANCE_FACTOR;
  return Math.min(RESISTANCE_START_PX + extra, MAX_VISUAL_OFFSET_PX);
}

export function usePullToRefreshVisual({
  target,
  enabled = true,
}: UsePullToRefreshVisualOptions): UsePullToRefreshVisualResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isReleasing, setIsReleasing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const pulling = useRef(false);
  const directionLocked = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const el = resolveElement(target);
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (getScrollPosition(target) > 0) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pulling.current = true;
      directionLocked.current = false;
      setIsReleasing(false);
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - startY.current;
      const deltaX = touchX - startX.current;

      if (!directionLocked.current) {
        const movedEnough =
          Math.abs(deltaY) > DIRECTION_LOCK_PX || Math.abs(deltaX) > DIRECTION_LOCK_PX;
        if (!movedEnough) return;

        if (Math.abs(deltaX) > Math.abs(deltaY) || deltaY < 0) {
          pulling.current = false;
          return;
        }
        directionLocked.current = true;
      }

      if (getScrollPosition(target) > 5) {
        pulling.current = false;
        directionLocked.current = false;
        setPullDistance(0);
        return;
      }

      setPullDistance(applyResistance(deltaY));
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      directionLocked.current = false;

      // Anima il rientro a 0, qualunque sia l'esito del refresh:
      // usePullToRefresh decide se eseguire onRefresh in modo del
      // tutto indipendente da questa animazione.
      setIsReleasing(true);
      setPullDistance(0);
    }

    el.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', onTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', onTouchEnd as EventListener);

    return () => {
      el.removeEventListener('touchstart', onTouchStart as EventListener);
      el.removeEventListener('touchmove', onTouchMove as EventListener);
      el.removeEventListener('touchend', onTouchEnd as EventListener);
    };
  }, [target, enabled]);

  return { pullDistance, isReleasing };
}
