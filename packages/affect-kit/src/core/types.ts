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
 */
export interface EmotionLabel {
  name: string; // kept as string so callers with string sources don't need a cast
  level: number;
}

/**
 * The captured rating object emitted by `<affect-kit-rater>` on every commit
 * and consumed by `<affect-kit-result>` for display.
 *
 * `v`/`a` drive visual rendering; `d` is preserved as analytical metadata.
 * `pad` keeps the raw drag position even after labels override `v`/`a`,
 * because the gut-vs-language gap is itself a research signal.
 */
export interface Rating {
  /** Valence, -1..1. Drives face shape and color. */
  v: number;
  /** Arousal, -1..1. Drives face shape and color. */
  a: number;
  /** Dominance, -1..1. Analytical metadata; not visualized. */
  d: number;
  /** Raw pad position before any label aggregation. */
  pad: { v: number; a: number };
  /** True when `v`/`a` were aggregated from labels rather than from drag. */
  fromLabels: boolean;
  /** Selected emotion words and their intensity. */
  labels: EmotionLabel[];
  /** ms since epoch at commit time. */
  timestamp: number;
}
