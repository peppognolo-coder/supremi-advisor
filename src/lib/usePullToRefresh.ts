/**
 * usePullToRefresh
 *
 * Hook minimale per il Pull-to-Refresh su un contenitore scrollabile interno.
 *
 * Responsabilità:
 *   1. Verifica che scrollTop === 0 al touchstart.
 *   2. Misura il trascinamento verso il basso.
 *   3. Applica il feedback visivo (translateY) alla lista.
 *   4. Esegue il refresh solo se la soglia viene superata.
 *   5. Ripristina lo stato al touchend.
 *
 * Non legge window.scrollY, document, body, né dipende da comportamenti
 * specifici del browser. Lavora esclusivamente su scrollRef.current.scrollTop.
 */

import { useEffect, useRef } from 'react';

const DEFAULT_THRESHOLD = 130;
const RESISTANCE        = 0.4;   // il contenuto segue il dito a velocità ridotta

interface UsePullToRefreshOptions {
  /** Contenitore scrollabile reale (overflow-y-auto). */
  scrollRef: React.RefObject<HTMLElement>;
  /** Elemento che riceve il translateY durante il pull (solo la lista). */
  listRef: React.RefObject<HTMLElement>;
  /** Callback invocata quando la soglia viene superata. */
  onRefresh: () => void;
  /** Pixel di trascinamento necessari per triggerare il refresh. Default: 130. */
  threshold?: number;
}

export function usePullToRefresh({
  scrollRef,
  listRef,
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
}: UsePullToRefreshOptions): void {

  const startY       = useRef(0);
  const currentY     = useRef(0);
  const pulling      = useRef(false);
  const refreshing   = useRef(false);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    function translate(px: number, animated: boolean) {
      const list = listRef.current;
      if (!list) return;
      list.style.transition = animated
        ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
        : 'none';
      list.style.transform = px > 0 ? `translateY(${px}px)` : '';
    }

    function onTouchStart(e: TouchEvent) {
      // 1. Il refresh parte solo dalla cima.
      if (scroller.scrollTop > 0) return;
      if (refreshing.current)     return;

      startY.current  = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === 0) return;   // touchstart non aveva armato

      const y      = e.touches[0].clientY;
      const deltaY = y - startY.current;

      // 2. Misura solo il trascinamento verso il basso.
      if (deltaY <= 0) {
        if (pulling.current) {
          pulling.current = false;
          translate(0, true);
        }
        return;
      }

      // Se il contenitore ha scrollato nel frattempo, annulla.
      if (scroller.scrollTop > 2) {
        pulling.current = false;
        translate(0, true);
        startY.current = 0;
        return;
      }

      // 3. Feedback visivo sulla lista.
      pulling.current  = true;
      currentY.current = y;
      translate(deltaY * RESISTANCE, false);

      if (e.cancelable) e.preventDefault();
    }

    function onTouchEnd() {
      if (!pulling.current) return;

      const distance = currentY.current - startY.current;

      // 5. Ripristina stato e posizione.
      pulling.current  = false;
      startY.current   = 0;
      currentY.current = 0;
      translate(0, true);

      // 4. Esegue il refresh solo oltre la soglia.
      if (distance > threshold && !refreshing.current) {
        refreshing.current = true;
        onRefreshRef.current();
        setTimeout(() => { refreshing.current = false; }, 1500);
      }
    }

    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove',  onTouchMove,  { passive: false });
    scroller.addEventListener('touchend',   onTouchEnd);

    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove',  onTouchMove);
      scroller.removeEventListener('touchend',   onTouchEnd);
      if (listRef.current) {
        listRef.current.style.transform  = '';
        listRef.current.style.transition = '';
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef, listRef, threshold]);
}
