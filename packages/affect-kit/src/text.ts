// `affect-kit/text` entry: reading a note for what it mentions, on the device.
// No custom elements, no DOM, no network: note text never leaves the device.
//
// When the person taps Done on a note, the screen fills in place with what the
// note mentions. Areas are kept, each with ✕, and (when allowed) feeling words
// are offered, dashed, at the base level. Nothing is suggested while typing.
//
// Bring your own classifier (anything with `version` and `classify`), or build
// one from phrase lists. Either way the library's cut decides what shows: at
// most three of each kind, none on a tie, nothing under four words, and never
// a pair the person dismissed twice.

export type {
  Found, FoundKind, FoundSource, FoundState, TextSpan, Skipped, SkipReason,
  Candidate, ClassifierOutput, TextClassifier, SuppressedPair,
} from './text/types';
export { normalizeNote, countWords, type NormalizedNote } from './text/normalize';
export {
  phraseListClassifier, type PhraseList, type PhraseListConfig, type PhraseException,
} from './text/phrase-list';
export { cut, CUT_RULES, type CutOptions, type CutResult } from './text/cut';
export { literalMatch } from './text/literal';
export {
  createHeard, heardReducer, newDismissals, HOPELESS_FAMILY, HEARD_TIMING,
  type HeardState, type HeardEvent, type HeardConfig,
} from './text/heard';
export {
  recordDismissals, suppressedPairs, suggestAgain, tallyCheckin, guardKey, guardRate, overGuard,
  DISMISSALS_TO_SUPPRESS, GUARD_LIMIT,
  type DismissalLog, type GuardCount, type GuardCounts,
} from './text/guard';
