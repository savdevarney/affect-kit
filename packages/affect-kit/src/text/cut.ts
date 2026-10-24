// Pure module: the cut. What a classifier found becomes what the screen
// shows, by the library's rules, whichever classifier found it:
// - nothing at all for a note under four words;
// - per kind, at most three, strongest first;
// - none of a kind when the cut falls on a tie (a fourth as strong as the third: too unsure);
// - a pair the person dismissed twice is dropped, but other phrases for the same name still count.
// Everything is ranked first and filtered to what may be shown after, so what
// a person sees is what was graded.

import { countWords } from './normalize';
import type { Candidate, ClassifierOutput, FoundKind, Skipped, SuppressedPair } from './types';

/** The cut's rules. */
export const CUT_RULES = {
  /** At most this many of each kind. */
  maxPerKind: 3,
  /** A note under this many words gets nothing. */
  minWords: 4,
} as const;

export interface CutOptions {
  /** Pairs the person dismissed twice (`suppressedPairs`). */
  suppressed?: readonly SuppressedPair[];
  /** Which names may be shown, such as those that cleared a grade. All by default. */
  shippable?: (kind: FoundKind, name: string) => boolean;
}

/** What the cut gives the screen, and what the counts need. */
export interface CutResult {
  /** To show, strongest first within each kind. */
  shown: Candidate[];
  /** Would have been shown, but for a suppressed pair: for the guard's counts. */
  suppressed: Candidate[];
  /** The classifier's near-misses, plus what the cut left out ('below-bar'). */
  skipped: Skipped[];
}

const pairKey = (kind: FoundKind, name: string, phrase: string) => JSON.stringify([kind, name, phrase]);

// A candidate without its suppressed phrases; null when none are left.
function withoutSuppressed(c: Candidate, suppressed: ReadonlySet<string>): Candidate | null {
  if (c.phrases.length === 0) return suppressed.has(pairKey(c.kind, c.name, '')) ? null : c;
  const phrases = c.phrases.filter(p => !suppressed.has(pairKey(c.kind, c.name, p.phrase)));
  if (phrases.length === 0) return null;
  const dropped = c.phrases.length - phrases.length;
  return { ...c, phrases, score: c.score - dropped };
}

// Strongest first; equal scores keep the classifier's order, so every engine agrees.
function ranked(candidates: Candidate[]): Candidate[] {
  return candidates.map((c, i) => ({ c, i })).sort((x, y) => y.c.score - x.c.score || x.i - y.i).map(x => x.c);
}

// One kind's cut: at most `max`, or none when the cut falls on a tie.
function cutKind(candidates: Candidate[]): Candidate[] {
  const order = ranked(candidates);
  const max = CUT_RULES.maxPerKind;
  if (order.length > max && order[max - 1]!.score === order[max]!.score) return [];
  return order.slice(0, max);
}

function cutAll(candidates: Candidate[]): Candidate[] {
  const kinds: FoundKind[] = ['feeling', 'area'];
  return kinds.flatMap(kind => cutKind(candidates.filter(c => c.kind === kind && c.score > 0)));
}

/**
 * What to show for a note, from a classifier's output.
 *
 * ```ts
 * const result = cut(classifier.classify(note), note, { suppressed: suppressedPairs(log) });
 * ```
 */
export function cut(output: ClassifierOutput, note: string, opts: CutOptions = {}): CutResult {
  const shippable = opts.shippable ?? (() => true);
  if (countWords(note) < CUT_RULES.minWords) {
    return { shown: [], suppressed: [], skipped: [...output.skipped, ...output.candidates.map(belowBar)] };
  }
  const suppressedKeys = new Set((opts.suppressed ?? []).map(p => pairKey(p.kind, p.name, p.phrase)));
  const kept = output.candidates.map(c => withoutSuppressed(c, suppressedKeys)).filter((c): c is Candidate => c !== null);

  const shown = cutAll(kept).filter(c => shippable(c.kind, c.name));
  // What the same cut would have shown with nothing suppressed.
  const wouldHave = cutAll(output.candidates).filter(c => shippable(c.kind, c.name));
  // Only those that lost a suppressed pair count: a tie the suppression caused leaves the others below the bar.
  const hitBySuppression = (c: Candidate) => (c.phrases.length === 0
    ? suppressedKeys.has(pairKey(c.kind, c.name, ''))
    : c.phrases.some(p => suppressedKeys.has(pairKey(c.kind, c.name, p.phrase))));
  const suppressed = wouldHave.filter(w => !shown.some(s => s.kind === w.kind && s.name === w.name) && hitBySuppression(w));
  const left = output.candidates.filter(c => !shown.some(s => s.kind === c.kind && s.name === c.name)
    && !suppressed.some(s => s.kind === c.kind && s.name === c.name));

  return { shown, suppressed, skipped: [...output.skipped, ...left.map(belowBar)] };
}

function belowBar(c: Candidate): Skipped {
  return {
    kind: c.kind,
    name: c.name,
    phrase: c.phrases[0]?.phrase ?? '',
    reason: 'below-bar',
    spans: c.phrases.flatMap(p => p.spans),
  };
}
