// Default English vocabulary — 56 emotions with V/A/D coordinates.
//
// Source: prototype values, all marked `source: 'approx'`.
// BEFORE v1.0: validate every entry against the NRC VAD Lexicon
// (Mohammad 2018). See docs/nrc-vad-validation.md for the plan.
// Replace `source: 'approx'` with `source: 'NRC'` as each entry is confirmed.

import type { Emotion } from './types';

/** @internal */
export const EMOTIONS: readonly Emotion[] = [
  // ── High arousal, negative valence ── anger zone ──────────────────────
  { name: 'anger',        v: -0.51, a:  0.59, d:  0.25, source: 'approx' },
  { name: 'fear',         v: -0.64, a:  0.60, d: -0.43, source: 'approx' },
  { name: 'anxious',      v: -0.32, a:  0.56, d: -0.51, source: 'approx' },
  { name: 'frustrated',   v: -0.40, a:  0.50, d:  0.20, source: 'approx' },
  { name: 'annoyed',      v: -0.40, a:  0.30, d:  0.15, source: 'approx' },
  { name: 'contempt',     v: -0.35, a:  0.20, d:  0.45, source: 'approx' },
  { name: 'disgust',      v: -0.60, a:  0.35, d:  0.11, source: 'approx' },
  { name: 'panicked',     v: -0.70, a:  0.85, d: -0.65, source: 'approx' },
  { name: 'overwhelmed',  v: -0.50, a:  0.55, d: -0.55, source: 'approx' },
  { name: 'enraged',      v: -0.65, a:  0.85, d:  0.40, source: 'approx' },
  { name: 'horrified',    v: -0.75, a:  0.65, d: -0.40, source: 'approx' },
  { name: 'shocked',      v: -0.30, a:  0.70, d: -0.30, source: 'approx' },
  { name: 'jealous',      v: -0.45, a:  0.40, d:  0.10, source: 'approx' },
  { name: 'humiliated',   v: -0.65, a:  0.35, d: -0.65, source: 'approx' },
  { name: 'embarrassed',  v: -0.40, a:  0.30, d: -0.55, source: 'approx' },

  // ── High arousal, positive valence ── joy zone ─────────────────────────
  { name: 'joy',          v:  0.76, a:  0.48, d:  0.35, source: 'approx' },
  { name: 'excited',      v:  0.62, a:  0.75, d:  0.38, source: 'approx' },
  { name: 'proud',        v:  0.65, a:  0.40, d:  0.55, source: 'approx' },
  { name: 'surprise',     v:  0.20, a:  0.67, d: -0.13, source: 'approx' },
  { name: 'awe',          v:  0.30, a:  0.50, d: -0.40, source: 'approx' },
  { name: 'amused',       v:  0.55, a:  0.45, d:  0.25, source: 'approx' },
  { name: 'inspired',     v:  0.55, a:  0.40, d:  0.35, source: 'approx' },
  { name: 'curious',      v:  0.55, a:  0.45, d:  0.30, source: 'approx' },
  { name: 'determined',   v:  0.55, a:  0.55, d:  0.65, source: 'approx' },
  { name: 'enchanted',    v:  0.65, a:  0.40, d: -0.30, source: 'approx' },
  { name: 'moved',        v:  0.55, a:  0.45, d: -0.20, source: 'approx' },
  { name: 'hopeful',      v:  0.55, a:  0.20, d:  0.20, source: 'approx' },
  { name: 'optimistic',   v:  0.60, a:  0.30, d:  0.40, source: 'approx' },
  { name: 'confident',    v:  0.65, a:  0.35, d:  0.65, source: 'approx' },

  // ── Low arousal, positive valence ── calm zone ─────────────────────────
  { name: 'calm',         v:  0.46, a: -0.65, d:  0.25, source: 'approx' },
  { name: 'content',      v:  0.55, a: -0.30, d:  0.30, source: 'approx' },
  { name: 'relaxed',      v:  0.50, a: -0.50, d:  0.30, source: 'approx' },
  { name: 'peaceful',     v:  0.45, a: -0.70, d:  0.25, source: 'approx' },
  { name: 'serene',       v:  0.50, a: -0.65, d:  0.20, source: 'approx' },
  { name: 'grateful',     v:  0.60, a: -0.20, d:  0.10, source: 'approx' },
  { name: 'satisfied',    v:  0.55, a: -0.15, d:  0.30, source: 'approx' },
  { name: 'safe',         v:  0.45, a: -0.45, d:  0.20, source: 'approx' },
  { name: 'loved',        v:  0.85, a:  0.20, d: -0.10, source: 'approx' },
  { name: 'affectionate', v:  0.70, a:  0.10, d:  0.20, source: 'approx' },
  { name: 'tender',       v:  0.60, a: -0.10, d:  0.10, source: 'approx' },
  { name: 'compassionate',v:  0.55, a:  0.10, d:  0.30, source: 'approx' },
  { name: 'focused',      v:  0.30, a:  0.30, d:  0.45, source: 'approx' },

  // ── Low arousal, negative valence ── sad zone ──────────────────────────
  { name: 'sad',          v: -0.63, a: -0.27, d: -0.33, source: 'approx' },
  { name: 'bored',        v: -0.20, a: -0.65, d: -0.16, source: 'approx' },
  { name: 'lonely',       v: -0.50, a: -0.30, d: -0.50, source: 'approx' },
  { name: 'tired',        v: -0.20, a: -0.50, d: -0.20, source: 'approx' },
  { name: 'ashamed',      v: -0.55, a: -0.10, d: -0.55, source: 'approx' },
  { name: 'disappointed', v: -0.50, a: -0.20, d: -0.30, source: 'approx' },
  { name: 'numb',         v: -0.20, a: -0.70, d: -0.30, source: 'approx' },
  { name: 'empty',        v: -0.40, a: -0.65, d: -0.40, source: 'approx' },
  { name: 'hopeless',     v: -0.75, a: -0.40, d: -0.65, source: 'approx' },
  { name: 'regretful',    v: -0.45, a: -0.25, d: -0.30, source: 'approx' },
  { name: 'guilty',       v: -0.55, a: -0.05, d: -0.45, source: 'approx' },
  { name: 'vulnerable',   v: -0.20, a:  0.10, d: -0.50, source: 'approx' },

  // ── Cross-quadrant ─────────────────────────────────────────────────────
  { name: 'nostalgic',    v:  0.15, a: -0.20, d: -0.20, source: 'approx' },
  { name: 'bittersweet',  v:  0.05, a:  0.10, d: -0.10, source: 'approx' },
];

// Index by name for O(1) lookup in computeVAD.
/** @internal */
export const EMOTIONS_BY_NAME: ReadonlyMap<string, (typeof EMOTIONS)[number]> =
  new Map(EMOTIONS.map(e => [e.name, e]));
