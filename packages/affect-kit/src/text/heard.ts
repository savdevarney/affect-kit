// Pure module: the note's screen as a reducer. When the person taps Done on a
// note, the screen fills in place with what the note mentions: areas already
// kept, each with ✕, and (when allowed) feeling words offered, dashed, at the
// base level. Nothing is suggested while typing. A native screen and a web one
// run the same reducer, so they agree.

import { RATER_TIMING } from '../core/rater';
import type { Rating } from '../core/types';
import type { CutResult } from './cut';
import { literalMatch } from './literal';
import { normalizeNote } from './normalize';
import type { Candidate, Found, FoundKind, SuppressedPair } from './types';

/**
 * Words that stop suggestions. When one is chosen, nothing from the note is
 * shown, and they are never offered themselves: help comes first.
 */
export const HOPELESS_FAMILY: readonly string[] = ['hopeless', 'worthless', 'empty', 'despairing'];

/** Timing for the screen filling in. */
export const HEARD_TIMING = {
  /** Results are on screen within this long after Done; slower, and the quote shows first while the chips rise in. No spinner. */
  budgetMs: 300,
  /** The chips rising in, as the rater's words appear. */
  chipsIn: RATER_TIMING.reveal,
  chipsFade: RATER_TIMING.revealFade,
} as const;

export interface HeardConfig {
  /**
   * Offer feeling words found in the note. Off by default: on only once the
   * feeling lists pass their grade. Even then, only when no feeling words were
   * chosen before the note. Areas don't wait on it.
   */
  offerFeelings?: boolean;
}

/** The note's screen, as plain data. */
export interface HeardState {
  text: string;
  found: Found[];
  /** Feelings were offered from the note before the rater opened: evals keep those words apart from words named unprompted. */
  offersBeforeRater: boolean;
  /** The rater closed with words: no new feeling offers for the rest of the check-in. */
  raterClosed: boolean;
  /** The crisis check raised help: nothing from the note shows, and nothing more is offered, for the rest of the check-in. */
  withdrawn: boolean;
}

export type HeardEvent =
  /** Done: fill the screen from the cut. */
  | { type: 'read'; text: string; result: CutResult; listVersion: string; config?: HeardConfig }
  /** The note was edited and Done tapped again. */
  | { type: 'reread'; text: string; result: CutResult; listVersion: string; config?: HeardConfig }
  /** A tap on an offered feeling: it's kept. */
  | { type: 'keep'; kind: FoundKind; name: string }
  /** ✕ on an area, or "Not now" on an offer. A note entry stays as removed, which counts as a dismissal. */
  | { type: 'remove'; kind: FoundKind; name: string }
  /** Added by hand, from the full list or "add a word". */
  | { type: 'add'; kind: FoundKind; name: string; level?: 1 | 2 | 3 }
  /** The rater sheet closed with words. */
  | { type: 'raterClosed'; rating: Rating }
  /** The crisis check raised help, even mid-typing: every entry from the note goes. */
  | { type: 'withdraw' };

/** The screen before Done, with any feeling words chosen in the step before (step 1's rater). */
export function createHeard(opts: { text?: string; rating?: Rating | null } = {}): HeardState {
  const text = opts.text ?? '';
  return {
    text,
    found: (opts.rating?.labels ?? []).map(l => raterEntry(l.name, l.level, text)),
    offersBeforeRater: false,
    raterClosed: false,
    withdrawn: false,
  };
}

function raterEntry(name: string, level: number, text: string): Found {
  return {
    kind: 'feeling', name, level: Math.max(1, Math.min(3, Math.round(level))) as 1 | 2 | 3,
    source: 'rater', state: 'chosen', spans: literalMatch(name, text), matchedPhrase: null, listVersion: null,
  };
}

function noteEntry(c: Candidate, listVersion: string): Found {
  return {
    kind: c.kind,
    name: c.name,
    level: c.kind === 'feeling' ? 1 : null, // an offer always starts at the base level
    source: 'note',
    state: c.kind === 'feeling' ? 'offered' : 'kept',
    spans: c.phrases.flatMap(p => p.spans),
    matchedPhrase: c.phrases[0]?.phrase ?? '',
    listVersion,
  };
}

const same = (f: { kind: FoundKind; name: string }, kind: FoundKind, name: string) => f.kind === kind && f.name === name;

// Whether anything from the note may show at all: not after a crisis, and not once a hopeless-family word is chosen.
function noteMayShow(state: HeardState): boolean {
  if (state.withdrawn) return false;
  return !state.found.some(f => f.kind === 'feeling' && f.state === 'chosen' && HOPELESS_FAMILY.includes(f.name));
}

// Whether feelings may be offered: the flag, no feeling chosen before the note, and the rater not yet closed.
function mayOffer(state: HeardState, config: HeardConfig | undefined): boolean {
  if (!config?.offerFeelings || state.raterClosed) return false;
  return !state.found.some(f => f.kind === 'feeling' && f.source === 'rater');
}

function admit(state: HeardState, c: Candidate, config: HeardConfig | undefined): boolean {
  if (c.kind === 'area') return true;
  return mayOffer(state, config) && !HOPELESS_FAMILY.includes(c.name);
}

// Whether what found a candidate includes words the old note didn't have:
// every match, not only each group's first.
function hasNewWords(c: Candidate, oldText: string, newText: string): boolean {
  const old = normalizeNote(oldText).text;
  return c.phrases.some(p => (p.spans.length === 0
    ? !old.includes(` ${p.phrase} `)
    : p.spans.some(s => !old.includes(normalizeNote(newText.slice(s.start, s.end)).text))));
}

/** The next state. The old one is never changed. */
export function heardReducer(state: HeardState, event: HeardEvent): HeardState {
  switch (event.type) {
    case 'read': {
      const base = { ...state, text: event.text };
      if (!noteMayShow(base)) return { ...base, found: base.found.filter(f => f.source !== 'note') };
      const present = (c: Candidate) => base.found.some(f => same(f, c.kind, c.name));
      const added = event.result.shown.filter(c => !present(c) && admit(base, c, event.config)).map(c => noteEntry(c, event.listVersion));
      return { ...base, found: [...base.found.filter(f => f.source !== 'note'), ...added] };
    }

    case 'reread': {
      const text = event.text;
      const found: Found[] = [];
      for (const f of state.found) {
        if (f.source !== 'note') {
          // Chosen and hand-added entries stay as they are; only where they appear can change.
          found.push(f.kind === 'feeling' ? { ...f, spans: literalMatch(f.name, text) } : f);
          continue;
        }
        const c = event.result.shown.find(s => same(s, f.kind, f.name));
        if (f.state === 'removed') {
          // Removed stays removed, unless the new note mentions it in new words.
          if (c && f.kind === 'area' && hasNewWords(c, state.text, text)) found.push(noteEntry(c, event.listVersion));
          else found.push(f);
        } else if (f.state === 'kept' && f.kind === 'feeling') {
          found.push({ ...f, spans: literalMatch(f.name, text) }); // a tapped offer is the person's now
        } else if (c && admit(state, c, event.config)) {
          found.push({ ...noteEntry(c, event.listVersion), state: f.state });
        }
        // Otherwise the words that found it are gone, and so is the entry.
      }
      const next: HeardState = { ...state, text, found };
      if (!noteMayShow(next)) return { ...next, found: found.filter(f => f.source !== 'note') };
      for (const c of event.result.shown) {
        if (!found.some(f => same(f, c.kind, c.name)) && admit(next, c, event.config)) found.push(noteEntry(c, event.listVersion));
      }
      return next;
    }

    case 'keep':
      return {
        ...state,
        found: state.found.map(f => (same(f, event.kind, event.name) && f.state === 'offered' ? { ...f, state: 'kept' } : f)),
      };

    case 'remove': {
      const found: Found[] = [];
      for (const f of state.found) {
        if (!same(f, event.kind, event.name)) found.push(f);
        else if (f.source === 'note') found.push({ ...f, state: 'removed' });
        else if (f.source === 'rater') found.push(f); // the rater's words change in the rater
        // Hand-added: simply gone.
      }
      return { ...state, found };
    }

    case 'add': {
      const others = state.found.filter(f => !(same(f, event.kind, event.name) && f.source !== 'rater'));
      if (others.some(f => same(f, event.kind, event.name))) return state; // already chosen in the rater
      const entry: Found = {
        kind: event.kind,
        name: event.name,
        level: event.kind === 'feeling' ? (event.level ?? 1) : null,
        source: 'picker',
        state: event.kind === 'feeling' ? 'chosen' : 'kept',
        spans: event.kind === 'feeling' ? literalMatch(event.name, state.text) : [],
        matchedPhrase: null,
        listVersion: null,
      };
      return { ...state, found: [...others, entry] };
    }

    case 'raterClosed': {
      const offered = state.found.some(f => f.kind === 'feeling' && f.source === 'note');
      const chosen = event.rating.labels.map(l => raterEntry(l.name, l.level, state.text));
      const found = state.found.filter(f => {
        if (f.kind !== 'feeling') return true;
        if (f.source === 'rater') return false;                                   // the rater's new words replace them
        if (f.source === 'note' && f.state === 'offered') return false;           // un-acted offers clear (not a dismissal)
        return !chosen.some(c => c.name === f.name);                              // chosen in the rater: the rater's entry wins
      });
      return {
        ...state,
        found: [...chosen, ...found],
        offersBeforeRater: state.offersBeforeRater || offered,
        raterClosed: true,
      };
    }

    case 'withdraw':
      return { ...state, found: state.found.filter(f => f.source !== 'note'), withdrawn: true };
  }
}

/**
 * The dismissals in a step: note entries that went to removed. Pass them to
 * `recordDismissals`. Offers cleared when the rater closed aren't dismissals.
 */
export function newDismissals(prev: HeardState, next: HeardState): SuppressedPair[] {
  return next.found
    .filter(f => f.source === 'note' && f.state === 'removed')
    .filter(f => !prev.found.some(p => same(p, f.kind, f.name) && p.state === 'removed'))
    .map(f => ({ kind: f.kind, name: f.name, phrase: f.matchedPhrase ?? '' }));
}
