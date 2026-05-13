// Public type surface — anything not exported here stays internal to the package.

import type { EmotionName } from '../vocabulary/en';

export type { EmotionName };

/**
 * Whether and how V/A color is applied.
 *
 * - `'background'` — tints the component surface (or panel glow) by the
 *   averaged V/A position. With many ratings of varied affect this can
 *   wash to gray; use `'words'` to avoid that.
 * - `'words'` — each emotion word picks up its own V/A color from the
 *   NRC lexicon (a "rainbow constellation"). The background stays neutral.
 *
 * Set via the `color-mode` HTML attribute. The attribute also accepts
 * legacy boolean-style usage (`<el color-mode>` → `'background'`).
 */
export type ColorMode = 'background' | 'words';

/**
 * Light vs dark surface treatment. Orthogonal to {@link ColorMode}:
 * theme picks the page (paper + ink polarity); color-mode picks what
 * gets painted on it. All six combinations are valid.
 *
 * - `'light'` (default) — dark ink on white paper.
 * - `'dark'` — white ink on dark paper. Words mode uses lighter V/A
 *   color variants to stay legible on the dark surface.
 * - `'auto'` — follow the user's `prefers-color-scheme` setting. The
 *   explicit `'light'` and `'dark'` values always override OS preference.
 *
 * Set via the `theme` HTML attribute.
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * A single emotion label attached to a rating, with intensity level in [1, 3].
 *
 * `name` is strictly typed to {@link EmotionName} — only words from the validated
 * vocabulary are permitted. `buildRating` and `createRating` will throw on any
 * name not present in the lexicon.
 *
 * `<affect-kit-rater>` always emits integer levels 1, 2, or 3. The type is
 * widened to `number` so longitudinal aggregations (e.g. an average level
 * across many sessions) can be passed straight to `<affect-kit-result>` for
 * rendering — the display interpolates size, weight, and opacity continuously.
 *
 * `vad` (optional) holds the NRC VAD Lexicon coordinates (NRC v2.1,
 * Mohammad 2025) for this specific word. When present it's the
 * **per-label, pre-aggregate** value — direct from the lexicon, identical
 * for every rating that contains this name.
 *
 * The rater always emits with `vad` inline so a captured Rating is a
 * complete snapshot. **For persistence**, consumers typically drop `vad`
 * (it's a deterministic function of `name`) and rehydrate on read from
 * {@link EMOTION_LABELS}. See `stripVad()` and `rehydrate()`.
 */
export interface EmotionLabel {
  name: EmotionName;
  level: number;
  vad?: { v: number; a: number; d: number };
}

/**
 * The captured rating object emitted by `<affect-kit-rater>` on commit
 * and consumed by `<affect-kit-result>` for display.
 *
 * **Two VAD sources, kept separate:**
 * - `face` — the pre-verbal pad gesture; drives the face glyph and color.
 *   Always present.
 * - `composite` — intensity-weighted centroid of the selected labels' VAD
 *   coordinates. Novel derivation, grounded in affective theory; treat as
 *   exploratory. `null` when no labels were selected.
 *
 * Components that need a single resolved VAD vector should use
 * `rating.composite ?? { v: rating.face.v, a: rating.face.a, d: 0 }`.
 */
export interface Rating {
  /** ms since epoch at commit time. */
  timestamp: number;
  /** Pad position that drives the face glyph and color. */
  face: { v: number; a: number };
  /** Selected emotion words with intensity and per-word VAD coordinates. */
  labels: EmotionLabel[];
  /**
   * Intensity-weighted centroid of selected labels' VAD values.
   * Novel derivation — not independently validated. `null` when no labels selected.
   */
  composite: { v: number; a: number; d: number } | null;
}
