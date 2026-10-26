// Pure module: where a chosen word appears in a note, literally: the word
// itself or a form of it ("tired", "so tired", "tiredness"), never a word
// that only means something like it.

import { normalizeNote, originalSpan } from './normalize';
import type { TextSpan } from './types';

// The vocabulary's nouns and the adjectives people write instead. Forms of the
// same word, not synonyms: "angry" is anger's, "furious" is not.
const FORMS: Readonly<Record<string, readonly string[]>> = {
  anger: ['angry', 'angrily', 'angered'],
  fear: ['fearful', 'fears', 'feared'],
  contempt: ['contemptuous'],
  disgust: ['disgusted', 'disgusting'],
  joy: ['joyful', 'joyous'],
  surprise: ['surprised', 'surprising'],
  awe: ['awed'],
  panicked: ['panic', 'panicking', 'panicky'],
};

// Inflections any word may take.
const SUFFIXES = ['', 's', 'ly', 'ness'];

/**
 * Where a feeling word appears in a note, literally, as spans of the note as
 * written. Matches whole words, ignoring case: "tired" finds "Tired", "so
 * tired" and "tiredness", never "exhausted".
 *
 * ```ts
 * literalMatch('tired', 'So tired after work'); // [{ start: 3, end: 8 }]
 * ```
 */
export function literalMatch(word: string, note: string): TextSpan[] {
  const base = word.trim().toLowerCase();
  if (!base) return [];
  const forms = [...SUFFIXES.map(s => base + s), ...(FORMS[base] ?? [])];
  const escaped = forms.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  const n = normalizeNote(note);
  const spans: TextSpan[] = [];
  for (const m of n.text.matchAll(re)) {
    const span = originalSpan(n, m.index!, m.index! + m[0].length);
    if (span) spans.push(span);
  }
  return spans;
}
