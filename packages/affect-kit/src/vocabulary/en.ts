// Default English vocabulary — 55 emotions with V/A/D coordinates.
//
// Source: NRC VAD Lexicon v2.1 (Mohammad 2025), scores already in [-1, 1].
// https://saifmohammad.com/WebPages/nrc-vad.html
// All entries validated March 2025. One word from the original prototype
// set ('focused') was absent from NRC and removed as it is attentional
// rather than affective.

import type { Emotion } from './types';

/** @internal */
export const EMOTIONS: readonly Emotion[] = [
  // ── High arousal, negative valence ── anger zone ──────────────────────
  { name: 'anger',        v: -0.666, a:  0.730, d:  0.314, source: 'NRC' },
  { name: 'fear',         v: -0.854, a:  0.680, d: -0.414, source: 'NRC' },
  { name: 'anxious',      v: -0.438, a:  0.750, d: -0.132, source: 'NRC' },
  { name: 'frustrated',   v: -0.840, a:  0.302, d: -0.490, source: 'NRC' },
  { name: 'annoyed',      v: -0.792, a:  0.566, d: -0.310, source: 'NRC' },
  { name: 'contempt',     v: -0.588, a:  0.270, d: -0.208, source: 'NRC' },
  { name: 'disgust',      v: -0.896, a:  0.550, d: -0.366, source: 'NRC' },
  { name: 'panicked',     v: -0.800, a:  0.898, d: -0.480, source: 'NRC' },
  { name: 'overwhelmed',  v: -0.318, a:  0.360, d: -0.304, source: 'NRC' },
  { name: 'enraged',      v: -0.834, a:  0.962, d: -0.250, source: 'NRC' },
  { name: 'horrified',    v: -0.920, a:  0.770, d: -0.264, source: 'NRC' },
  { name: 'shocked',      v: -0.416, a:  0.546, d: -0.250, source: 'NRC' },
  { name: 'jealous',      v: -0.654, a:  0.710, d: -0.310, source: 'NRC' },
  { name: 'humiliated',   v: -0.792, a:  0.424, d: -0.568, source: 'NRC' },
  { name: 'embarrassed',  v: -0.632, a:  0.120, d: -0.470, source: 'NRC' },

  // ── High arousal, positive valence ── joy zone ─────────────────────────
  { name: 'joy',          v:  0.960, a:  0.648, d:  0.588, source: 'NRC' },
  { name: 'excited',      v:  0.816, a:  0.862, d:  0.418, source: 'NRC' },
  { name: 'proud',        v:  0.812, a:  0.400, d:  0.746, source: 'NRC' },
  { name: 'surprise',     v:  0.750, a:  0.750, d:  0.124, source: 'NRC' },
  { name: 'awe',          v: -0.062, a:  0.480, d: -0.400, source: 'NRC' },
  { name: 'amused',       v:  0.884, a:  0.694, d:  0.192, source: 'NRC' },
  { name: 'inspired',     v:  0.934, a:  0.404, d:  0.472, source: 'NRC' },
  { name: 'curious',      v:  0.270, a:  0.200, d: -0.034, source: 'NRC' },
  { name: 'determined',   v:  0.469, a:  0.056, d:  0.346, source: 'NRC' },
  { name: 'enchanted',    v:  0.834, a:  0.266, d:  0.374, source: 'NRC' },
  { name: 'moved',        v:  0.524, a:  0.519, d: -0.167, source: 'NRC' },
  { name: 'hopeful',      v:  0.894, a: -0.286, d:  0.254, source: 'NRC' },
  { name: 'optimistic',   v:  0.958, a:  0.160, d:  0.642, source: 'NRC' },
  { name: 'confident',    v:  0.530, a: -0.352, d:  0.446, source: 'NRC' },

  // ── Low arousal, positive valence ── calm zone ─────────────────────────
  { name: 'calm',         v:  0.750, a: -0.900, d: -0.373, source: 'NRC' },
  { name: 'content',      v:  0.528, a: -0.408, d:  0.118, source: 'NRC' },
  { name: 'relaxed',      v:  0.730, a: -0.910, d: -0.189, source: 'NRC' },
  { name: 'peaceful',     v:  0.734, a: -0.892, d:  0.149, source: 'NRC' },
  { name: 'serene',       v:  0.604, a: -0.736, d: -0.260, source: 'NRC' },
  { name: 'grateful',     v:  0.916, a: -0.294, d:  0.120, source: 'NRC' },
  { name: 'satisfied',    v:  0.918, a:  0.020, d:  0.370, source: 'NRC' },
  { name: 'safe',         v:  0.796, a: -0.388, d:  0.518, source: 'NRC' },
  { name: 'loved',        v:  0.854, a: -0.096, d:  0.164, source: 'NRC' },
  { name: 'affectionate', v:  0.898, a: -0.156, d:  0.100, source: 'NRC' },
  { name: 'tender',       v:  0.260, a:  0.040, d:  0.018, source: 'NRC' },
  { name: 'compassionate',v:  0.714, a: -0.192, d: -0.178, source: 'NRC' },

  // ── Low arousal, negative valence ── sad zone ──────────────────────────
  { name: 'sad',          v: -0.550, a: -0.334, d: -0.702, source: 'NRC' },
  { name: 'bored',        v: -0.694, a: -0.666, d: -0.608, source: 'NRC' },
  { name: 'lonely',       v: -0.500, a: -0.548, d: -0.524, source: 'NRC' },
  { name: 'tired',        v: -0.750, a: -0.366, d: -0.523, source: 'NRC' },
  { name: 'ashamed',      v: -0.688, a:  0.176, d: -0.544, source: 'NRC' },
  { name: 'disappointed', v: -0.858, a: -0.056, d: -0.518, source: 'NRC' },
  { name: 'numb',         v: -0.784, a: -0.160, d: -0.296, source: 'NRC' },
  { name: 'empty',        v: -0.624, a: -0.634, d: -0.919, source: 'NRC' },
  { name: 'hopeless',     v: -0.812, a: -0.404, d: -0.888, source: 'NRC' },
  { name: 'regretful',    v: -0.666, a: -0.040, d: -0.624, source: 'NRC' },
  { name: 'guilty',       v: -0.730, a:  0.540, d: -0.296, source: 'NRC' },
  { name: 'vulnerable',   v: -0.604, a: -0.020, d: -0.510, source: 'NRC' },

  // ── Cross-quadrant ─────────────────────────────────────────────────────
  { name: 'nostalgic',    v: -0.084, a: -0.298, d: -0.632, source: 'NRC' },
  { name: 'bittersweet',  v: -0.062, a:  0.138, d: -0.052, source: 'NRC' },
];

// Index by name for O(1) lookup in computeVAD.
/** @internal */
export const EMOTIONS_BY_NAME: ReadonlyMap<string, (typeof EMOTIONS)[number]> =
  new Map(EMOTIONS.map(e => [e.name, e]));

/**
 * Union of every valid emotion name in the English vocabulary.
 * Use this to type-check label names at compile time:
 *
 * ```ts
 * import type { EmotionName } from 'affect-kit';
 * const label: EmotionName = 'joy';       // ✓
 * const bad:   EmotionName = 'happiness'; // ✗ type error
 * ```
 */
export type EmotionName = (typeof EMOTIONS)[number]['name'];
