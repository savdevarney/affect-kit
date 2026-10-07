// Pure module: find vocabulary labels by V/A distance, by prefix, and in text.
// No DOM, no Lit.

import { EMOTIONS, type EmotionName } from './en';
import { SYNONYMS_EN } from './synonyms-en';

/** A label found by {@link completeLabels}. */
export interface LabelMatch {
  name: EmotionName;
  /**
   * The everyday word that led to `name`, when it wasn't the label itself:
   * `{ name: 'overwhelmed', synonym: 'stressed' }`.
   */
  synonym?: string;
}

/**
 * Vocabulary labels ordered by straight-line distance from (v, a), closest
 * first. This is the order `<affect-kit-rater>` sorts its chips in.
 * Returns the `n` closest, or all 55 when `n` is omitted.
 *
 * ```ts
 * nearestLabels(0.8, 0.7, 3); // ['surprise', 'amused', 'excited']
 * ```
 */
export function nearestLabels(v: number, a: number, n: number = EMOTIONS.length): EmotionName[] {
  return EMOTIONS
    .map(e => ({ name: e.name, dist: Math.hypot(e.v - v, e.a - a) }))
    .sort((x, y) => x.dist - y.dist)
    .slice(0, n)
    .map(e => e.name);
}

/**
 * Labels that start with `prefix`, or have a synonym in {@link SYNONYMS_EN}
 * that does, ordered by distance from (v, a) like {@link nearestLabels}.
 * Matching ignores case and surrounding spaces. Each label appears once; a
 * label matched only through a synonym carries the shortest synonym that
 * matched. An empty prefix returns every label.
 *
 * ```ts
 * completeLabels('stre', -0.4, 0.5); // [{ name: 'overwhelmed', synonym: 'stress' }]
 * ```
 */
export function completeLabels(prefix: string, v: number, a: number): LabelMatch[] {
  const typed = prefix.trim().toLowerCase();
  const synonymFor = new Map<EmotionName, string>();
  for (const [word, name] of Object.entries(SYNONYMS_EN)) {
    if (!word.startsWith(typed)) continue;
    const current = synonymFor.get(name);
    if (current === undefined || word.length < current.length) synonymFor.set(name, word);
  }

  const matches: LabelMatch[] = [];
  for (const name of nearestLabels(v, a)) {
    if (name.startsWith(typed)) matches.push({ name });
    else {
      const synonym = synonymFor.get(name);
      if (synonym !== undefined) matches.push({ name, synonym });
    }
  }
  return matches;
}
