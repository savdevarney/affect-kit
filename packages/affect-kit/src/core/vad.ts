// Pure module: aggregate selected emotion labels into a VAD vector,
// then build the canonical Rating object. No DOM, no Lit, no state.

import type { EmotionLabel, Rating } from './types';
import type { EmotionName } from '../vocabulary/en';
import { EMOTIONS_BY_NAME } from '../vocabulary/en';

/** @internal Aggregated V/A/D after label weighting. */
export interface AggregatedVad {
  v: number;
  a: number;
  d: number;
  /** Intensity-weighted centroid of label NRC VAD values; null when no labels. */
  composite: { v: number; a: number; d: number } | null;
}

/**
 * @internal
 * Aggregate VAD from active labels weighted by intensity level (1/3, 2/3, 3/3).
 * Returns pad V/A with d=0 and composite=null when the label list is empty.
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

  const composite = totalW === 0
    ? null
    : { v: vSum / totalW, a: aSum / totalW, d: dSum / totalW };

  return {
    v: composite?.v ?? padV,
    a: composite?.a ?? padA,
    d: composite?.d ?? 0,
    composite,
  };
}

/**
 * @internal
 * Build the canonical Rating object at commit time.
 * Labels are enriched with their NRC VAD coordinates from the vocabulary.
 * `now` is injectable for testing; defaults to `Date.now`.
 */
export function buildRating(args: {
  padV: number;
  padA: number;
  labels: EmotionLabel[];
  now?: () => number;
}): Rating {
  const { padV, padA, labels, now = Date.now } = args;

  // Enrich labels with NRC VAD coordinates where the name is known.
  const enrichedLabels: EmotionLabel[] = labels.map(l => {
    const emotion = EMOTIONS_BY_NAME.get(l.name);
    if (!emotion) return l;
    return { ...l, vad: { v: emotion.v, a: emotion.a, d: emotion.d } };
  });

  const vad = computeVAD(padV, padA, enrichedLabels);
  return {
    timestamp: now(),
    raw:       { v: padV, a: padA },
    labels:    enrichedLabels,
    composite: vad.composite,
    v:         vad.v,
    a:         vad.a,
    d:         vad.d,
  };
}

/**
 * Public helper — construct a {@link Rating} from a V/A pad position and
 * optional emotion labels. Use this when building ratings programmatically
 * rather than via `<affect-kit-rater>`.
 *
 * ```ts
 * import { createRating } from 'affect-kit';
 *
 * const r = createRating({
 *   v: 0.6, a: 0.4,
 *   labels: [{ name: 'joy', level: 3 }],
 * });
 * ```
 */
export function createRating(args: {
  v: number;
  a: number;
  labels?: Array<{ name: EmotionName; level: number }>;
  timestamp?: number;
}): Rating {
  const { v, a, labels = [], timestamp } = args;
  const opts: Parameters<typeof buildRating>[0] = { padV: v, padA: a, labels };
  if (timestamp != null) opts.now = () => timestamp;
  return buildRating(opts);
}

/**
 * Collapse a series of {@link Rating}s into one synthetic averaged Rating
 * suitable for `<affect-kit-result>` to render as a longitudinal summary.
 *
 * - `v` / `a` / `d` are simple means of the rendering shorthands.
 * - `raw` is the mean of each rating's raw pad position.
 * - `composite` is the mean of all non-null composites; `null` if none present.
 * - Labels are aggregated by name: each emotion's level is its mean level
 *   across the sessions it appeared in, frequency-boosted so something said
 *   often-and-strongly outranks a one-off.
 * - The synthetic rating's `timestamp` is the latest input timestamp.
 *
 * Returns `null` when the input is empty.
 *
 * ```ts
 * import { averageRatings } from 'affect-kit';
 *
 * resultEl.rating = averageRatings(history); // history: Rating[]
 * ```
 */
export function averageRatings(ratings: Rating[]): Rating | null {
  if (ratings.length === 0) return null;
  const n = ratings.length;

  let vSum = 0, aSum = 0, dSum = 0;
  let rawVSum = 0, rawASum = 0;
  for (const r of ratings) {
    vSum    += r.v; aSum    += r.a; dSum    += r.d;
    rawVSum += r.raw.v; rawASum += r.raw.a;
  }

  // Average non-null composites; null if no ratings had labels.
  const withComposite = ratings.filter(r => r.composite !== null);
  const composite = withComposite.length === 0 ? null : {
    v: withComposite.reduce((s, r) => s + r.composite!.v, 0) / withComposite.length,
    a: withComposite.reduce((s, r) => s + r.composite!.a, 0) / withComposite.length,
    d: withComposite.reduce((s, r) => s + r.composite!.d, 0) / withComposite.length,
  };

  const byName = new Map<string, { sum: number; count: number }>();
  for (const r of ratings) {
    for (const l of r.labels) {
      const e = byName.get(l.name) ?? { sum: 0, count: 0 };
      e.sum   += l.level;
      e.count += 1;
      byName.set(l.name, e);
    }
  }

  // Frequency boost: a word said in many sessions outranks a one-off.
  // 0.6 floor so a word that appeared once at level 3 still shows up clearly.
  let maxCount = 1;
  for (const { count } of byName.values()) if (count > maxCount) maxCount = count;

  const labels: EmotionLabel[] = [];
  for (const [name, { sum, count }] of byName) {
    const avgLevel  = sum / count;
    const freqBoost = 0.6 + 0.4 * (count / maxCount);
    const emotion   = EMOTIONS_BY_NAME.get(name);
    const label: EmotionLabel = { name, level: avgLevel * freqBoost };
    if (emotion) label.vad = { v: emotion.v, a: emotion.a, d: emotion.d };
    labels.push(label);
  }
  labels.sort((a, b) => b.level - a.level);

  const v = vSum / n;
  const a = aSum / n;
  return {
    timestamp: ratings[ratings.length - 1]!.timestamp,
    raw:       { v: rawVSum / n, a: rawASum / n },
    labels,
    composite,
    v,
    a,
    d: dSum / n,
  };
}
