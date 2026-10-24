// Pure module: the vocabulary ordered by distance from a face position.
// No DOM, no Lit.

import { EMOTIONS, type EmotionName } from './en';

/**
 * The 55 words ordered by straight-line distance from (v, a) in valence and
 * arousal, nearest first. This is the order the rater shows its words in.
 * Ties keep vocabulary order, so every JavaScript engine sorts the same.
 *
 * ```ts
 * wordOrder(0.8, 0.7).slice(0, 3); // ['surprise', 'amused', 'excited']
 * ```
 */
export function wordOrder(v: number, a: number): EmotionName[] {
  return EMOTIONS
    .map((e, index) => ({ name: e.name, index, dist: Math.hypot(e.v - v, e.a - a) }))
    .sort((x, y) => x.dist - y.dist || x.index - y.index)
    .map(e => e.name);
}
