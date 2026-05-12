// Pure module: aggregate selected emotion labels into a VAD vector,
// then build the canonical Rating object. No DOM, no Lit, no state.

import type { EmotionLabel, Rating, EmotionName } from './types';
import { EMOTIONS_BY_NAME } from '../vocabulary/en';

/**
 * @internal Strict validation: names must come from the validated vocabulary.
 * Throws on unknown — the package never silently accepts unvalidated labels.
 */
function lookupEmotion(name: string) {
  const emotion = EMOTIONS_BY_NAME.get(name);
  if (!emotion) {
    throw new Error(
      `Unknown emotion name: "${name}". Names must come from the validated vocabulary.`
    );
  }
  return emotion;
}

/**
 * @internal
 * Aggregate VAD from active labels weighted by intensity level (1/3, 2/3, 3/3).
 * Returns `null` when the label list is empty. Caller is responsible for
 * falling back to `face` when the composite is null.
 *
 * Tolerant of labels missing inline `vad` — falls back to the lexicon
 * lookup via `EMOTION_LABELS[name]`. This means consumers persisting the
 * minimal `{ name, level }` shape can hand stripped Ratings to
 * `computeComposite` directly without rehydrating first.
 */
export function computeComposite(
  labels: EmotionLabel[]
): { v: number; a: number; d: number } | null {
  let totalW = 0, vSum = 0, aSum = 0, dSum = 0;

  for (const label of labels) {
    const weight = label.level / 3;
    const vad = label.vad ?? lookupEmotion(label.name);
    vSum   += vad.v * weight;
    aSum   += vad.a * weight;
    dSum   += vad.d * weight;
    totalW += weight;
  }

  if (totalW === 0) return null;
  return { v: vSum / totalW, a: aSum / totalW, d: dSum / totalW };
}

/**
 * @internal
 * Build the canonical Rating object at commit time.
 * Each input label is validated against the vocabulary and enriched with its
 * lexicon VAD coordinates. `now` is injectable for testing; defaults to `Date.now`.
 */
export function buildRating(args: {
  face: { v: number; a: number };
  labels: Array<{ name: EmotionName; level: number }>;
  now?: () => number;
}): Rating {
  const { face, labels, now = Date.now } = args;

  // Validate + enrich every label with its NRC VAD coordinates.
  const enrichedLabels: EmotionLabel[] = labels.map(l => {
    const emotion = lookupEmotion(l.name);
    return {
      name:  emotion.name as EmotionName,
      level: l.level,
      vad:   { v: emotion.v, a: emotion.a, d: emotion.d },
    };
  });

  return {
    timestamp: now(),
    face:      { v: face.v, a: face.a },
    labels:    enrichedLabels,
    composite: computeComposite(enrichedLabels),
  };
}

/**
 * Public helper — construct a {@link Rating} from a pad position and optional
 * emotion labels. Use this when building ratings programmatically rather than
 * via `<affect-kit-rater>`.
 *
 * Throws if any label name is not in the validated vocabulary.
 *
 * ```ts
 * import { createRating } from 'affect-kit';
 *
 * const r = createRating({
 *   face: { v: 0.6, a: 0.4 },
 *   labels: [{ name: 'joy', level: 3 }],
 * });
 * ```
 */
export function createRating(args: {
  face: { v: number; a: number };
  labels?: Array<{ name: EmotionName; level: number }>;
  timestamp?: number;
}): Rating {
  const { face, labels = [], timestamp } = args;
  const opts: Parameters<typeof buildRating>[0] = { face, labels };
  if (timestamp != null) opts.now = () => timestamp;
  return buildRating(opts);
}

/**
 * Collapse a series of {@link Rating}s into one synthetic averaged Rating
 * suitable for `<affect-kit-result>` to render as a longitudinal summary.
 *
 * - `face` is the simple mean of each rating's face position.
 * - `composite` is the mean of all non-null composites; `null` if no rating
 *   in the series had labels selected.
 * - Labels are aggregated by name: each emotion's level is its mean level
 *   across the sessions it appeared in, frequency-boosted so something said
 *   often-and-strongly outranks a one-off.
 * - The synthetic rating's `timestamp` is the latest input timestamp.
 *
 * Returns `null` when the input is empty.
 */
export function averageRatings(ratings: Rating[]): Rating | null {
  if (ratings.length === 0) return null;
  const n = ratings.length;

  let faceVSum = 0, faceASum = 0;
  for (const r of ratings) {
    faceVSum += r.face.v;
    faceASum += r.face.a;
  }

  const withComposite = ratings.filter(r => r.composite !== null);
  const composite = withComposite.length === 0 ? null : {
    v: withComposite.reduce((s, r) => s + r.composite!.v, 0) / withComposite.length,
    a: withComposite.reduce((s, r) => s + r.composite!.a, 0) / withComposite.length,
    d: withComposite.reduce((s, r) => s + r.composite!.d, 0) / withComposite.length,
  };

  const byName = new Map<EmotionName, { sum: number; count: number }>();
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
    const emotion   = lookupEmotion(name); // safe: names came from validated Ratings
    labels.push({
      name,
      level: avgLevel * freqBoost,
      vad:   { v: emotion.v, a: emotion.a, d: emotion.d },
    });
  }
  labels.sort((a, b) => b.level - a.level);

  return {
    timestamp: ratings[ratings.length - 1]!.timestamp,
    face:      { v: faceVSum / n, a: faceASum / n },
    labels,
    composite,
  };
}

/**
 * Return a copy of a Rating with `vad` removed from every label.
 *
 * The minimal storage form for time-series persistence: VAD coordinates
 * are a deterministic function of `name`, so storing them per-row is
 * redundant. Strip on insert, rehydrate on read with `rehydrate()`.
 *
 * ```ts
 * import { stripVad } from 'affect-kit';
 *
 * const lean = stripVad(rating);
 * // lean.labels[i] is { name, level }  — no vad
 * db.ratings.insert(lean);
 * ```
 */
export function stripVad(rating: Rating): Rating {
  return {
    ...rating,
    labels: rating.labels.map(({ name, level }) => ({ name, level })),
  };
}

/**
 * Return a copy of a Rating with `vad` filled in from the lexicon for
 * every label that's missing it. The inverse of `stripVad`.
 *
 * Labels that already have `vad` inline pass through unchanged — useful
 * when working with mixed inputs (e.g. some snapshot Ratings + some
 * stripped Ratings from a DB).
 *
 * Throws if any label name is not in the validated vocabulary.
 *
 * ```ts
 * import { rehydrate } from 'affect-kit';
 *
 * const full = rehydrate(rowFromDb);
 * // full.labels[i] now has { name, level, vad }
 * result.rating = full;
 * ```
 */
export function rehydrate(rating: Rating): Rating {
  return {
    ...rating,
    labels: rating.labels.map(l => {
      if (l.vad) return l;
      const e = lookupEmotion(l.name);
      return { name: l.name, level: l.level, vad: { v: e.v, a: e.a, d: e.d } };
    }),
  };
}
