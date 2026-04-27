// Public type surface — anything not exported here stays internal to the package.

/**
 * A single emotion label attached to a rating, with intensity level 1–3.
 *
 * Level 0 means "not selected" and is never present in `Rating.labels`.
 */
export interface EmotionLabel {
  name: string;
  level: 1 | 2 | 3;
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
