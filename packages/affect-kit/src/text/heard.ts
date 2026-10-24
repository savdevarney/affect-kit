// Pure module: the note's screen as a reducer. When the person taps Done on a
// note, the screen fills in place with what the note mentions: areas already
// kept, each with ✕, and (when allowed) feeling words offered, dashed, at the
// base level. Nothing is suggested while typing. A native screen and a web one
// run the same reducer, so they agree.

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

const EASE = [0.25, 0.1, 0.25, 1] as const;

/**
 * The heard moment, when the screen fills in after Done: the quote settles,
 * then each phrase the note was read for lights in reading order and its chip
 * rises in. With at most three areas and one offer it stays under two seconds.
 */
export const HEARD_TIMING = {
  /** Results are ready within this long after Done. Slower, and the quote shows first while the chips arrive. No spinner. */
  budgetMs: 300,
  /** After the quote settles, before the first phrase lights. */
  delayMs: 300,
  /** Between one phrase and the next, in reading order. */
  staggerMs: 450,
  /** A chip rising in: up `chipRise` px with an opacity fade, no blur. */
  chipIn: { ms: 320, bezier: [0.16, 1, 0.3, 1] },
  chipRise: 8,
  /** A phrase's highlight fading. */
  highlightFade: { ms: 500, bezier: EASE },
  /** With Reduce Motion: everything at once, a 200 ms opacity fade. */
  reduced: { fade: { ms: 200, bezier: EASE } },
} as const;

/**
 * When each entry from the note lights, in ms after the quote settles: in
 * reading order (where the note first says it), `HEARD_TIMING.staggerMs`
 * apart. Under Reduce Motion, all at 0.
 */
export function heardSchedule(state: HeardState, opts: { reducedMotion?: boolean } = {}): Array<{ kind: FoundKind; name: string; atMs: number }> {
  const shown = state.found
    .filter(f => f.source === 'note' && (f.state === 'kept' || f.state === 'offered'))
    .map((f, i) => ({ f, i, at: f.spans[0]?.start ?? Number.MAX_SAFE_INTEGER }))
    .sort((x, y) => x.at - y.at || x.i - y.i);
  return shown.map(({ f }, n) => ({
    kind: f.kind,
    name: f.name,
    atMs: opts.reducedMotion ? 0 : HEARD_TIMING.delayMs + n * HEARD_TIMING.staggerMs,
  }));
}

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
  /** ✕ on an area, or "Not now" on an offer. A note entry stays as removed: a dismissal when the check-in is saved (`dismissalsAtSave`). */
  | { type: 'remove'; kind: FoundKind; name: string }
  /** Added by hand, from the full list or "add a word". Adding back an area taken off undoes that ✕: it isn't a dismissal or a removal. */
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
      const before = state.found.find(f => same(f, event.kind, event.name) && f.source === 'note' && f.state === 'removed');
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
        ...(before?.matchedPhrase != null && before.listVersion != null
          ? { foundInNote: { matchedPhrase: before.matchedPhrase, listVersion: before.listVersion } }
          : {}),
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
 * The dismissals to record when the check-in is saved: note entries the person
 * took off and left off. Pass them to `recordDismissals`. An offer cleared when
 * the rater closed isn't one, and neither is an area added back by hand.
 * Nothing counts if the check-in isn't saved.
 */
export function dismissalsAtSave(state: HeardState): SuppressedPair[] {
  return state.found
    .filter(f => f.source === 'note' && f.state === 'removed')
    .map(f => ({ kind: f.kind, name: f.name, phrase: f.matchedPhrase ?? '' }));
}
