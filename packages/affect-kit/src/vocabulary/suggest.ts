// Pure module: suggest vocabulary labels for a piece of free text, with an
// intensity and an honest confidence. Rules only, no model, no network.
// The rules are general English (negation, intensifiers, hedges), not tuned
// to any set of notes; see test/unit/suggest.test.ts for how they score.

import { EMOTIONS_BY_NAME, type EmotionName } from './en';
import { SYNONYMS_EN } from './synonyms-en';

/**
 * How directly the text names the label, not a probability:
 * - `'high'` — the label itself ("anxious").
 * - `'medium'` — an everyday word for it ("stressed" → overwhelmed).
 * - `'low'` — either of those, but hedged ("maybe", "I guess", "seems").
 */
export type SuggestionConfidence = 'high' | 'medium' | 'low';

/** A label the text points at. */
export interface LabelSuggestion {
  name: EmotionName;
  /** Intensity 1-3, as the rater's chips use: 2 unless the words around it say otherwise. */
  level: 1 | 2 | 3;
  confidence: SuggestionConfidence;
  /** The everyday word that led to `name`, when it wasn't the label itself. */
  synonym?: string;
}

const NEGATORS = new Set([
  'not', 'no', 'never', 'hardly', 'barely', 'without', 'nor',
  "isn't", "aren't", "wasn't", "weren't", "don't", "didn't", "doesn't", "can't", "won't",
]);
// Intensifiers and softeners, looked for in the two words before a feeling word.
const MORE = new Set([
  'really', 'so', 'very', 'extremely', 'totally', 'super', 'incredibly', 'completely',
  'deeply', 'utterly', 'absolutely', 'insanely', 'seriously', 'ugh',
]);
const LESS = new Set(['bit', 'little', 'slightly', 'mildly', 'somewhat', 'kinda', 'sorta', 'faintly', 'tad', 'mild', 'slight']);
const LESS_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['kind', 'of'], ['sort', 'of'], ['a', 'bit'], ['a', 'little'], ['a', 'tad'],
];
// Words whose own meaning is strong or faint, regardless of what's around them.
const STRONG_WORDS = new Set([
  'furious', 'livid', 'terrified', 'thrilled', 'heartbroken', 'miserable', 'exhausted', 'enraged', 'horrified', 'panicked',
]);
const FAINT_WORDS = new Set(['meh', 'uneasy', 'bummed']);
// Hedges that make a match less certain, looked for in the three words before it.
const HEDGES = new Set(['maybe', 'perhaps', 'guess', 'might', 'seems', 'seem', 'supposedly', 'possibly', 'probably']);

// Words, with inner apostrophes kept so "can't" stays whole, and sentence punctuation as its own token.
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/’/g, "'").match(/[\p{L}]+(?:'[\p{L}]+)*|[.,;:!?]/gu) ?? [];
}

const CLAUSE_END = /^[.;:!?]$/;

function isNegated(tokens: string[], at: number): boolean {
  // A negator up to three words back, within the same clause. A comma doesn't end the clause.
  for (let j = at - 1; j >= Math.max(0, at - 3); j--) {
    const t = tokens[j]!;
    if (CLAUSE_END.test(t)) return false;
    if (NEGATORS.has(t)) return true;
  }
  return false;
}

function levelFor(tokens: string[], at: number): 1 | 2 | 3 {
  const word = tokens[at]!;
  const prev = tokens.slice(Math.max(0, at - 2), at);
  if (prev.some(p => LESS.has(p))) return 1;
  if (prev.length === 2 && LESS_PHRASES.some(([a, b]) => prev[0] === a && prev[1] === b)) return 1;
  if (prev.some(p => MORE.has(p)) || STRONG_WORDS.has(word)) return 3;
  if (FAINT_WORDS.has(word)) return 1;
  return 2;
}

function confidenceFor(tokens: string[], at: number, viaSynonym: boolean): SuggestionConfidence {
  const hedged = tokens.slice(Math.max(0, at - 3), at).some(t => HEDGES.has(t));
  if (hedged) return 'low';
  return viaSynonym ? 'medium' : 'high';
}

/**
 * Labels a piece of text points at, in the order they first appear, each
 * once, with an intensity and a confidence. It matches whole words that are
 * labels or in {@link SYNONYMS_EN}, skips a word that was negated ("not
 * stressed"), and reads intensity from words just before it ("really",
 * "a bit").
 *
 * What it can't do: feelings named indirectly ("I can't switch my brain
 * off"), words outside the lists, or whose feeling it is ("my sister is
 * angry" still suggests anger). Treat the result as suggestions for the
 * person to accept, never as what they feel.
 *
 * ```ts
 * suggestLabels('Really stressed, but not sad');
 * // [{ name: 'overwhelmed', level: 3, confidence: 'medium', synonym: 'stressed' }]
 * ```
 */
export function suggestLabels(text: string): LabelSuggestion[] {
  const tokens = tokenize(text);
  const found = new Map<EmotionName, LabelSuggestion>();
  tokens.forEach((word, at) => {
    const isLabel = EMOTIONS_BY_NAME.has(word);
    const name = isLabel ? (word as EmotionName) : Object.hasOwn(SYNONYMS_EN, word) ? SYNONYMS_EN[word] : undefined;
    if (name === undefined || found.has(name) || isNegated(tokens, at)) return;
    const suggestion: LabelSuggestion = {
      name,
      level: levelFor(tokens, at),
      confidence: confidenceFor(tokens, at, !isLabel),
    };
    if (!isLabel) suggestion.synonym = word;
    found.set(name, suggestion);
  });
  return [...found.values()];
}
