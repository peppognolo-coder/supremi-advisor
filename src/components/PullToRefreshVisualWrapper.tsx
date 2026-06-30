/**
 * PullToRefreshVisualWrapper
 *
 * Wrapper di sola presentazione: avvolge il contenuto di una schermata e
 * applica una traslazione verticale che segue il gesto di pull, basandosi
 * su usePullToRefreshVisual. Non contiene alcuna logica di refresh — si
 * limita a tradurre `pullDistance` in uno stile CSS.
 *
 * Va usato accanto a usePullToRefresh (che resta l'unica fonte di verità
 * su quando il refresh scatta davvero), passandogli lo stesso target:
 *
 *   usePullToRefresh({ target: window, onRefresh: handleRefresh });
 *
 *   return (
 *     <PullToRefreshVisualWrapper target={window}>
 *       <div className="flex flex-col gap-4">
 *         ...contenuto esistente della schermata...
 *       </div>
 *     </PullToRefreshVisualWrapper>
 *   );
 */

import type { ReactNode } from 'react';
import { usePullToRefreshVisual } from '../lib/usePullToRefreshVisual';

interface Props {
  target: Window | React.RefObject<HTMLElement>;
  children: ReactNode;
  enabled?: boolean;
}

export default function PullToRefreshVisualWrapper({ target, children, enabled = true }: Props) {
  const { pullDistance, isReleasing } = usePullToRefreshVisual({ target, enabled });

  return (
    <div
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isReleasing
          ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
      }}
    >
      {children}
    </div>
  );
}