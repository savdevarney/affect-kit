import { LEXICON, MILD_INTENSIFIERS, NEGATORS, STRONG_INTENSIFIERS, UNMATCHED_FEELINGS } from './lexicon-table.ts';
import type { Extraction, Face, FeelingExtractor, FoundWord, Level, UnmatchedWord } from '../ports.ts';

interface Span {
  start: number;
  end: number;
}

/**
 * The deterministic baseline: phrase matching against a small table, with
 * intensifiers ("so tired" → 3, "a bit anxious" → 1), negation ("not anxious"
 * isn't anxious) and shouting ("TIRED" → 3). No model, so it's also the
 * fallback when a model fails, the path that works offline, and how local dev
 * runs without Cloudflare credentials.
 */
export class LexiconExtractor implements FeelingExtractor {
  readonly id = 'lexicon/v1';

  async extract(input: { text: string; face: Face | null }): Promise<Extraction> {
    const { text } = input;
    const folded = fold(text);
    const taken: Span[] = [];
    const words: (FoundWord & { at: number })[] = [];
    const unmatched: (UnmatchedWord & { at: number })[] = [];

    for (const entry of LEXICON) {
      for (const span of find(folded, entry.phrase)) {
        if (overlaps(taken, span)) continue;
        taken.push(span);
        const clause = clauseBefore(folded, span.start);
        if (isNegated(clause)) continue;
        const intensifier = intensifierBefore(clause);
        const shouted = isShouted(text.slice(span.start, span.end));
        const level: Level = shouted ? 3 : intensifier?.level ?? entry.level ?? 2;
        const start = intensifier ? span.start - intensifier.length : span.start;
        words.push({ name: entry.name, level, evidence: text.slice(start, span.end), confidence: entry.confidence, at: start });
      }
    }

    for (const { phrase, said } of UNMATCHED_FEELINGS) {
      for (const span of find(folded, phrase)) {
        if (overlaps(taken, span) || isNegated(clauseBefore(folded, span.start))) continue;
        taken.push(span);
        unmatched.push({ said, evidence: text.slice(span.start, span.end), at: span.start });
      }
    }

    // In the order they wrote them, which is how they'll read them back.
    const inOrder = <T extends { at: number }>(items: T[]) => items.sort((x, y) => x.at - y.at).map(({ at: _at, ...item }) => item);
    return { words: inOrder(words), unmatched: inOrder(unmatched) };
  }
}

/** Lowercase with straight apostrophes, keeping every index the same as the original text. */
function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    out += lower.length === ch.length ? lower : ch;
  }
  return out.replace(/[‘’ʼ]/g, "'");
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every whole-word occurrence of a phrase; spaces in the phrase match any run of whitespace. */
function* find(folded: string, phrase: string): Generator<Span> {
  const pattern = new RegExp(`(?<![\\p{L}])${phrase.split(' ').map(escape).join('\\s+')}(?![\\p{L}])`, 'gu');
  for (const match of folded.matchAll(pattern)) {
    yield { start: match.index, end: match.index + match[0].length };
  }
}

const overlaps = (taken: readonly Span[], span: Span) => taken.some((t) => span.start < t.end && t.start < span.end);

/** The text from the start of the clause up to a position: punctuation and "but" end a clause. */
function clauseBefore(folded: string, position: number): string {
  const before = folded.slice(0, position);
  const boundary = Math.max(...[/[.!?;,:\n]/g, /\bbut\b/g].map((re) => [...before.matchAll(re)].at(-1)?.index ?? -1));
  return before.slice(boundary + 1);
}

/** A negator among the last three words of the clause: "not", "never", "wasn't"… */
function isNegated(clause: string): boolean {
  const tokens = clause.match(/[\p{L}']+/gu) ?? [];
  return tokens.slice(-3).some((t) => NEGATORS.includes(t) || t.endsWith("n't"));
}

/** An intensifier right before the phrase, with its length in the text (so evidence can include it). */
function intensifierBefore(clause: string): { level: Level; length: number } | null {
  for (const [list, level] of [[MILD_INTENSIFIERS, 1], [STRONG_INTENSIFIERS, 3]] as const) {
    for (const word of list) {
      const match = clause.match(new RegExp(`(?<![\\p{L}])${word.split(' ').map(escape).join('\\s+')}\\s+$`, 'u'));
      if (match) return { level, length: match[0].length };
    }
  }
  return null;
}

/** "TIRED": three or more letters, all capitals. */
function isShouted(original: string): boolean {
  const letters = original.replace(/[^\p{L}]/gu, '');
  return letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}
