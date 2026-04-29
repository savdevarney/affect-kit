// Public type surface — anything not exported here stays internal to the package.

export type { EmotionName } from '../vocabulary/en';

/**
 * A single emotion label attached to a rating, with intensity level in [1, 3].
 * `name` must be a valid {@link EmotionName} from the English vocabulary.
 *
 * `<affect-kit-rater>` always emits integer levels 1, 2, or 3. The type is
 * widened to `number` so longitudinal aggregations (e.g. an average level
 * across many sessions) can be passed straight to `<affect-kit-result>` for
 * rendering — the display interpolates size, weight, and opacity continuously.
 *
 * Level 0 means "not selected" and is never present in `Rating.labels`.
 *
 * `vad` holds the VAD coordinates for this emotion name from the NRC VAD Lexicon
 * (National Research Council Canada, Mohammad 2025). Populated automatically by
 * `buildRating` and `createRating` when the name is in the vocabulary; absent for
 * unknown names.
 */
export interface EmotionLabel {
  name: string; // kept as string so callers with string sources don't need a cast
  level: number;
  vad?: { v: number; a: number; d: number };
}

/**
 * The captured rating object emitted by `<affect-kit-rater>` on commit
 * and consumed by `<affect-kit-result>` for display.
 *
 * **Two sources of VAD:**
 * - `raw` — the pre-verbal pad gesture; always present.
 * - `composite` — intensity-weighted centroid of the selected labels' NRC VAD
 *   coordinates. This is a novel, unvalidated derivation grounded in affective
 *   theory. Researchers should treat it as exploratory. `null` when no labels
 *   were selected.
 *
 * **Rendering shorthands** — `v`, `a`, `d` are pre-resolved for convenience:
 * `composite ?? { v: raw.v, a: raw.a, d: 0 }`. Use `raw` or `composite` directly
 * for analytical work.
 */
export interface Rating {
  /** ms since epoch at commit time. */
  timestamp: number;
  /** Raw pad position — the pre-verbal gut gesture, independent of label choice. */
  raw: { v: number; a: number };
  /** Selected emotion words with intensity and NRC VAD coordinates. */
  labels: EmotionLabel[];
  /**
   * Intensity-weighted centroid of selected labels' NRC VAD values.
   * Novel derivation — not independently validated. `null` when no labels selected.
   */
  composite: { v: number; a: number; d: number } | null;
  /** Valence, -1..1. Rendering shorthand: `composite?.v ?? raw.v`. */
  v: number;
  /** Arousal, -1..1. Rendering shorthand: `composite?.a ?? raw.a`. */
  a: number;
  /** Dominance, -1..1. Rendering shorthand: `composite?.d ?? 0`. */
  d: number;
}
