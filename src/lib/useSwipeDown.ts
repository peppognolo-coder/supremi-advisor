/**
 * useSwipeDown
 *
 * Aggiunge gesture swipe-down per chiudere un pannello bottom-sheet.
 *
 * Uso:
 *   const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose });
 *
 *   <div ref={panelRef} style={dragStyle} onTouchStart={handleDragStart}>
 *     ...
 *   </div>
 *
 * Comportamento:
 * - Trascina il pannello verso il basso seguendo il dito
 * - Se supera THRESHOLD (100px) → chiusura con animazione slide-out
 * - Se non supera → snap-back fluido alla posizione originale
 * - Non si attiva se l'utente sta scrollando il contenuto interno
 */

import { useRef, useState, useCallback } from 'react';

const THRESHOLD     = 100;   // px verso il basso per triggare la chiusura
const SNAP_DURATION = 250;   // ms animazione snap-back
const EXIT_DURATION = 220;   // ms animazione uscita

interface Options {
  onClose: () => void;
  /** Se true il pannello non scrollerà internamente (default: false) */
  noInternalScroll?: boolean;
}

interface SwipeDownResult {
  /** Ref da applicare al div del pannello */
  panelRef: React.RefObject<HTMLDivElement>;
  /** Stile inline da applicare al div del pannello */
  dragStyle: React.CSSProperties;
  /** Handler onTouchStart da applicare al div del pannello */
  handleDragStart: (e: React.TouchEvent) => void;
  /** true mentre sta avvenendo l'animazione di chiusura */
  isClosing: boolean;
}

export function useSwipeDown({ onClose, noInternalScroll = false }: Options): SwipeDownResult {
  const panelRef      = useRef<HTMLDivElement>(null);
  const startY        = useRef(0);
  const startX        = useRef(0);
  const currentDelta  = useRef(0);
  const isDragging    = useRef(false);
  const dirLocked     = useRef<'vertical' | 'horizontal' | null>(null);
  const scrollableEl  = useRef<HTMLElement | null>(null);

  const [dragY, setDragY]     = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  // Controlla se l'elemento toccato è scrollabile e ha contenuto da scorrere
  function isScrolledToTop(el: HTMLElement | null): boolean {
    if (!el || noInternalScroll) return true;
    return el.scrollTop <= 0;
  }

  function findScrollableParent(el: HTMLElement | null, boundary: HTMLElement | null): HTMLElement | null {
    let current = el;
    while (current && current !== boundary) {
      if (current.scrollHeight > current.clientHeight && getComputedStyle(current).overflowY !== 'visible') {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    if (isClosing) return;

    startY.current       = e.touches[0].clientY;
    startX.current       = e.touches[0].clientX;
    currentDelta.current = 0;
    isDragging.current   = true;
    dirLocked.current    = null;

    // Identifica l'eventuale elemento scrollabile interno
    scrollableEl.current = findScrollableParent(
      e.target as HTMLElement,
      panelRef.current
    );

    function handleMove(ev: TouchEvent) {
      if (!isDragging.current) return;

      const dy = ev.touches[0].clientY - startY.current;
      const dx = ev.touches[0].clientX - startX.current;

      // Lock direzione dopo 8px di movimento
      if (!dirLocked.current) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        dirLocked.current = Math.abs(dy) >= Math.abs(dx) ? 'vertical' : 'horizontal';
      }

      // Gesto orizzontale → ignora
      if (dirLocked.current === 'horizontal') {
        cleanup();
        return;
      }

      // Gesto verticale verso il basso:
      // Non attivare se c'è contenuto scrollabile non ancora in cima
      if (dy > 0 && scrollableEl.current && !isScrolledToTop(scrollableEl.current)) {
        return;
      }

      // Solo verso il basso (dy > 0)
      if (dy <= 0) return;

      // Resistenza: rallenta il drag oltre i 150px
      const resistance = dy > 150 ? 150 + (dy - 150) * 0.3 : dy;
      currentDelta.current = resistance;
      setDragY(resistance);

      // Fade overlay proporzionale al drag
      const prog = Math.min(dy / (THRESHOLD * 1.5), 1);
      setOpacity(1 - prog * 0.3);
    }

    function handleEnd() {
      if (!isDragging.current) return;
      cleanup();

      if (currentDelta.current >= THRESHOLD) {
        // ── Chiusura: slide-out verso il basso ──
        setIsClosing(true);
        const panelH = panelRef.current?.offsetHeight ?? 400;
        setDragY(panelH + 40);
        setOpacity(0);
        setTimeout(() => {
          onClose();
          // Reset (nel caso il componente non si smonta subito)
          setDragY(0);
          setOpacity(1);
          setIsClosing(false);
        }, EXIT_DURATION);
      } else {
        // ── Snap-back ──
        setDragY(0);
        setOpacity(1);
      }

      currentDelta.current = 0;
    }

    function cleanup() {
      isDragging.current = false;
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    }

    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd,   { passive: true });
    window.addEventListener('touchcancel', handleEnd,{ passive: true });
  }, [isClosing, onClose, noInternalScroll]);

  const dragStyle: React.CSSProperties = {
    transform:  `translateY(${dragY}px)`,
    opacity,
    transition: isDragging.current
      ? 'none'
      : `transform ${SNAP_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${SNAP_DURATION}ms ease`,
    willChange: 'transform, opacity',
    touchAction: 'pan-x',  // lascia pan-x al browser, gestiamo pan-y noi
  };

  return { panelRef, dragStyle, handleDragStart, isClosing };
}
