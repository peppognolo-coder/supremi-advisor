/**
 * useScrollLock
 *
 * Hook da chiamare in ogni modal al mount.
 * - Blocca document.body scroll (overflow: hidden)
 * - Espone un ref globale `modalOpenCount` che App.tsx
 *   usa per impedire il pull-to-refresh mentre un modal è aperto.
 *
 * Sicuro per modal annidati: usa un contatore, non un semplice boolean.
 * Al cleanup (unmount) decrementa il contatore e ripristina lo scroll
 * solo quando tutti i modal sono chiusi.
 */

import { useEffect } from 'react';

// Contatore globale modal aperti — accessibile da App.tsx
export const modalOpenCount = { current: 0 };

export function useScrollLock() {
  useEffect(() => {
    modalOpenCount.current += 1;

    // Salva la posizione scroll corrente per ripristinarla
    const scrollY = window.scrollY;

    // Blocca body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      modalOpenCount.current = Math.max(0, modalOpenCount.current - 1);

      // Ripristina solo se non ci sono altri modal aperti
      if (modalOpenCount.current === 0) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        // Ripristina la posizione scroll esatta
        window.scrollTo(0, scrollY);
      }
    };
  }, []);
}
