// Pure module: aggregate selected emotion labels into a VAD vector,
// then build the canonical Rating object. No DOM, no Lit, no state.
// Implementation comes in a follow-up commit.

import type { EmotionLabel, Rating } from './types';

/** @internal Aggregated V/A/D after label weighting. */
export interface AggregatedVad {
  v: number;
  a: number;
  d: number;
  fromLabels: boolean;
}

/**
 * @internal
 * Aggregate V/A/D from selected labels weighted by level (1/3, 2/3, 3/3).
 * Returns pad V/A unchanged with `fromLabels: false` when no labels are active.
 */
export function computeVAD(_padV: number, _padA: number, _labels: EmotionLabel[]): AggregatedVad {
  throw new Error('computeVAD: not implemented');
}

/**
 * @internal
 * Build the canonical Rating object at commit time. Constructor; never
 * called inside an animation loop.
 */
export function buildRating(_args: {
  padV: number;
  padA: number;
  labels: EmotionLabel[];
  now?: () => number;
}): Rating {
  throw new Error('buildRating: not implemented');
}
