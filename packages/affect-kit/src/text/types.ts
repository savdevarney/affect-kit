// The found-in-text model: what a note was read for, what the person did
// with it, and the shape a classifier returns. Types only.

/** What was found: one of the 55 feeling words, or an area of life an app names ("work", "sleep"). */
export type FoundKind = 'feeling' | 'area';

/**
 * Where an entry came from:
 * - `'rater'`: chosen in the rater.
 * - `'note'`: found in the note's words.
 * - `'picker'`: added by hand on the note's screen, from the full list or "add a word".
 * - `'learn'`: from a learning card, outside the check-in.
 */
export type FoundSource = 'rater' | 'note' | 'picker' | 'learn';

/**
 * Where an entry stands:
 * - `'chosen'`: a feeling the person chose (in the rater, or by hand).
 * - `'offered'`: a feeling found in the note, shown dashed, waiting for a tap.
 * - `'kept'`: on the record. An area found in the note starts here, with ✕; a tapped offer moves here.
 * - `'removed'`: the person took it off (✕, or "Not now").
 */
export type FoundState = 'chosen' | 'offered' | 'kept' | 'removed';

/** A stretch of the note, as UTF-16 offsets into the text as written: `text.slice(start, end)`. */
export interface TextSpan {
  start: number;
  end: number;
}

/** One entry on the note's screen. */
export interface Found {
  kind: FoundKind;
  /** An `EmotionName` for a feeling; the app's own id for an area. */
  name: string;
  /** A feeling's level, 1 to 3; an offer always starts at 1. `null` for an area. */
  level: 1 | 2 | 3 | null;
  source: FoundSource;
  state: FoundState;
  /** Where the note says it: what the screen can underline. */
  spans: TextSpan[];
  /** The phrase that found it, normalized (`'note'` entries): the key for suppression. */
  matchedPhrase: string | null;
  /** The classifier's version that found it (`'note'` entries), so counts and evals keep versions apart. */
  listVersion: string | null;
}

/** Why a phrase that looked like a mention wasn't one. */
export type SkipReason = 'someone-else' | 'past' | 'negated' | 'idiom' | 'below-bar';

/** A near-miss: kept for evals and for explaining, never shown. */
export interface Skipped {
  kind: FoundKind;
  name: string;
  /** The words that were set aside, normalized. */
  phrase: string;
  reason: SkipReason;
  spans: TextSpan[];
}

/** One thing a classifier found, with the phrases that found it. */
export interface Candidate {
  kind: FoundKind;
  name: string;
  /** Higher is stronger. For the phrase-list engine, the number of phrases. */
  score: number;
  /** Each phrase, normalized, with where it is. A model that can't point at words may leave this empty. */
  phrases: Array<{ phrase: string; spans: TextSpan[] }>;
}

/** What a classifier returns for a note. */
export interface ClassifierOutput {
  /** Everything it found, in its own order. The cut ranks them. */
  candidates: Candidate[];
  skipped: Skipped[];
}

/**
 * Bring your own: anything that reads a note and says what it mentions. It
 * runs on the device, the same on every platform; note text never leaves it.
 */
export interface TextClassifier {
  /** Names this version of the lists or model. Counts and evals are kept per version. */
  version: string;
  classify(text: string): ClassifierOutput;
}

/** A pair the person dismissed: this name, found through this phrase. */
export interface SuppressedPair {
  kind: FoundKind;
  name: string;
  phrase: string;
}
