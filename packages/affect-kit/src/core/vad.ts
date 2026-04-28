// Pure module: aggregate selected emotion labels into a VAD vector,
// then build the canonical Rating object. No DOM, no Lit, no state.

import type { EmotionLabel, Rating } from './types';
import { EMOTIONS_BY_NAME } from '../vocabulary/en';

/** @internal Aggregated V/A/D after label weighting. */
export interface AggregatedVad {
  v: number;
  a: number;
  d: number;
  fromLabels: boolean;
}

/**
 * @internal
 * Aggregate VAD from active labels weighted by intensity level (1/3, 2/3, 3/3).
 * Returns pad V/A with d=0 and fromLabels=false when the label list is empty.
 * Unknown emotion names are silently skipped.
 */
export function computeVAD(padV: number, padA: number, labels: EmotionLabel[]): AggregatedVad {
  let totalW = 0, vSum = 0, aSum = 0, dSum = 0;

  for (const { name, level } of labels) {
    const emotion = EMOTIONS_BY_NAME.get(name);
    if (!emotion) continue;
    const weight = level / 3;
    vSum   += emotion.v * weight;
    aSum   += emotion.a * weight;
    dSum   += emotion.d * weight;
    totalW += weight;
  }

  if (totalW === 0) return { v: padV, a: padA, d: 0, fromLabels: false };
  return { v: vSum / totalW, a: aSum / totalW, d: dSum / totalW, fromLabels: true };
}

/**
 * @internal
 * Build the canonical Rating object at commit time.
 * `now` is injectable for testing; defaults to `Date.now`.
 */
export function buildRating(args: {
  padV: number;
  padA: number;
  labels: EmotionLabel[];
  now?: () => number;
}): Rating {
  const { padV, padA, labels, now = Date.now } = args;
  const vad = computeVAD(padV, padA, labels);
  return {
    v:          vad.v,
    a:          vad.a,
    d:          vad.d,
    pad:        { v: padV, a: padA },
    fromLabels: vad.fromLabels,
    labels,
    timestamp:  now(),
  };
}
