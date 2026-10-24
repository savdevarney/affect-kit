// Pure module: a classifier from phrase lists. The mechanics are the
// library's; the lists are the app's data.
//
// How it reads a note:
// - **Anchors:** each name has anchor groups, words or phrases that put it in
//   the note ("my boss", "slept"), never themes. A note scores one per group
//   it matches, and a group's words are spent once matched, so "no sleep"
//   counts once, not again as "sleep". List specific groups first.
// - **Exceptions:** idioms and someone else's things that look like an anchor
//   and aren't ("running late", "a friend's shift"). Their words are taken
//   out before that name's anchors are read, and recorded as skipped, with
//   their reason.
// - **Set-asides:** for every name, first: what the note says is not the point
//   ("nothing to do with work", "work was fine"). Skipped as 'negated'.
// - Matching is on whole words, case-insensitive, with straight quotes.
//
// Patterns are regular-expression sources with Unicode classes (\p{L}).

import { normalizeNote, originalSpan, type NormalizedNote } from './normalize';
import type { Candidate, FoundKind, SkipReason, Skipped, TextClassifier, TextSpan } from './types';

/** An exception: a pattern, and why it isn't a mention ('idiom' when only a pattern is given). */
export type PhraseException = string | { pattern: string; reason: SkipReason };

/** One name's phrases. */
export interface PhraseList {
  /** Anchor groups, specific ones first. Each is alternatives: `'boss|manager|colleagues?'`. */
  anchors: readonly string[];
  except?: readonly PhraseException[];
}

/** A phrase-list classifier's data. */
export interface PhraseListConfig {
  /** Names this version of the lists: bump it with any change, since counts and evals are kept per version. */
  version: string;
  /** What the names are. Default `'area'`. */
  kind?: FoundKind;
  lists: Readonly<Record<string, PhraseList>>;
  /** Patterns taken out for every name before any list is read. */
  setAsides?: readonly string[];
}

// A group of alternatives as whole words. The note is padded with spaces, so
// a boundary at either end always holds.
const groupRegex = (source: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'gu');

interface Match { start: number; end: number; text: string }

function matches(text: string, re: RegExp): Match[] {
  re.lastIndex = 0;
  const out: Match[] = [];
  for (const m of text.matchAll(re)) {
    if (m[0].length === 0) continue;
    out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
  }
  return out;
}

// Spaces over a match, keeping every offset where it was.
function blank(text: string, m: Match): string {
  return text.slice(0, m.start) + ' '.repeat(m.end - m.start) + text.slice(m.end);
}

function spanOf(n: NormalizedNote, m: Match): TextSpan[] {
  const span = originalSpan(n, m.start, m.end);
  return span ? [span] : [];
}

/**
 * A classifier from phrase lists. The cut (`cut`) ranks what it finds; this
 * returns every name with at least one anchor, in the lists' order.
 *
 * ```ts
 * const areas = phraseListClassifier({
 *   version: 'v2',
 *   lists: { sleep: { anchors: ['slept|insomnia', 'nap|naps'], except: ['sleeping on it'] } },
 * });
 * cut(areas.classify(note), note);
 * ```
 */
export function phraseListClassifier(config: PhraseListConfig): TextClassifier {
  const kind = config.kind ?? 'area';
  const setAsides = (config.setAsides ?? []).map(groupRegex);
  const compiled = Object.entries(config.lists).map(([name, list]) => ({
    name,
    anchors: list.anchors.map(groupRegex),
    except: (list.except ?? []).map(e => (typeof e === 'string'
      ? { re: groupRegex(e), reason: 'idiom' as SkipReason }
      : { re: groupRegex(e.pattern), reason: e.reason })),
  }));
  // Whether any of a name's anchors appear in a stretch of words.
  const mentions = (anchors: RegExp[], words: string) => anchors.some(a => matches(` ${words} `, a).length > 0);

  return {
    version: config.version,
    classify(note) {
      const n = normalizeNote(note);
      const skipped: Skipped[] = [];
      let text = n.text;

      for (const re of setAsides) {
        for (const m of matches(text, re)) {
          for (const list of compiled) {
            if (mentions(list.anchors, m.text)) skipped.push({ kind, name: list.name, phrase: m.text.trim(), reason: 'negated', spans: spanOf(n, m) });
          }
          text = blank(text, m);
        }
      }

      const candidates: Candidate[] = [];
      for (const list of compiled) {
        let t = text;
        for (const { re, reason } of list.except) {
          for (const m of matches(t, re)) {
            if (mentions(list.anchors, m.text)) skipped.push({ kind, name: list.name, phrase: m.text.trim(), reason, spans: spanOf(n, m) });
            t = blank(t, m);
          }
        }
        const phrases: Candidate['phrases'] = [];
        for (const anchor of list.anchors) {
          const found = matches(t, anchor);
          if (found.length === 0) continue;
          phrases.push({ phrase: found[0]!.text.trim(), spans: found.flatMap(m => spanOf(n, m)) });
          for (const m of found) t = blank(t, m); // spent: a word counts for one group only
        }
        if (phrases.length > 0) candidates.push({ kind, name: list.name, score: phrases.length, phrases });
      }
      return { candidates, skipped };
    },
  };
}
