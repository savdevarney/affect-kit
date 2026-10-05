import { EMOTION_LABELS, type EmotionName } from 'affect-kit/data';

export type { EmotionName };

/** The vocabulary's words, in the package's order. */
export const EMOTION_NAMES = Object.keys(EMOTION_LABELS) as EmotionName[];

const NAMES: ReadonlySet<string> = new Set(EMOTION_NAMES);

export const isEmotionName = (name: string): name is EmotionName => NAMES.has(name);

/** V/A/D of a vocabulary word, from the lexicon. */
export const coordinates = (name: EmotionName): { v: number; a: number; d: number } => EMOTION_LABELS[name];

/**
 * A content id for the vocabulary: its size and a hash of every word and coordinate.
 * Every extraction run stores it, so re-runs can be compared across vocabulary
 * versions, and an affect-kit release that changes no words changes no id.
 */
export const VOCABULARY_ID = `en-${EMOTION_NAMES.length}-${fnv1a(JSON.stringify(EMOTION_LABELS))}`;

/**
 * The words nearest a face position, nearest first: the rater's own chip order
 * (Euclidean distance in V/A). Used as suggestions when no words came through,
 * and as the `face-nearest` baseline in evals.
 */
export function nearestWords(face: { v: number; a: number }, count: number): EmotionName[] {
  return [...EMOTION_NAMES]
    .map((name) => ({ name, distance: Math.hypot(EMOTION_LABELS[name].v - face.v, EMOTION_LABELS[name].a - face.a) }))
    .sort((x, y) => x.distance - y.distance)
    .slice(0, count)
    .map((x) => x.name);
}

/**
 * Words ordered for reading a list of them: pleasant to unpleasant, then calm to
 * activated within similar valence, so neighbours on screen are neighbours in
 * the lexicon. Used by the week view's rows.
 */
export function readingOrder(names: Iterable<EmotionName>): EmotionName[] {
  return [...names].sort((x, y) => {
    const a = EMOTION_LABELS[x];
    const b = EMOTION_LABELS[y];
    return b.v - a.v || a.a - b.a;
  });
}

/** FNV-1a, 32-bit, as 8 hex digits: a small, stable content hash. Not for security. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
