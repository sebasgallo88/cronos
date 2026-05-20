/**
 * Snap del brush temporal a la narrativa pre-computada más cercana.
 *
 * El usuario arrastra un brush sobre el eje (start, end). Buscamos la narrativa
 * cuyo (start, end) minimiza |Δstart| + |Δend|. Si no hay narrativas, null.
 */

import type { Narrative } from './dataTypes';

export interface SnapResult {
  narrative: Narrative;
  brushStart: number;
  brushEnd: number;
  drift: number;          // |Δstart| + |Δend|
  exactMatch: boolean;    // true si snap es 0
}

export function findClosestNarrative(
  brushStart: number,
  brushEnd: number,
  narratives: Narrative[] | undefined,
): SnapResult | null {
  if (!narratives || narratives.length === 0) return null;
  // Ordenamos brush si el usuario brusheó al revés
  const bStart = Math.min(brushStart, brushEnd);
  const bEnd = Math.max(brushStart, brushEnd);

  let best: Narrative | null = null;
  let bestDrift = Infinity;
  for (const n of narratives) {
    const drift = Math.abs(n.start_year - bStart) + Math.abs(n.end_year - bEnd);
    if (drift < bestDrift) {
      best = n;
      bestDrift = drift;
    }
  }
  if (!best) return null;
  return {
    narrative: best,
    brushStart: bStart,
    brushEnd: bEnd,
    drift: bestDrift,
    exactMatch: bestDrift === 0,
  };
}
