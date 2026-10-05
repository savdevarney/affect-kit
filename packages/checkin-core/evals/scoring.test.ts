import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PhraseSafetyScreen } from '../src/safety/phrase-screen.ts';
import type { FoundWord } from '../src/ports.ts';
import { parseFeelingCases, parseSafetyCases, percentile, scoreCase, summarize, summarizeSafety, type FeelingCase } from './scoring.ts';

const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const word = (name: FoundWord['name'], level: FoundWord['level'] = 2, confidence = 0.8): FoundWord => ({ name, level, evidence: name, confidence });

const proudWiped: FeelingCase = {
  id: 'proud-wiped',
  face: { v: 0.3, a: -0.5 },
  text: "Presentation went fine but I'm wiped. Kind of proud though.",
  expected: [
    { any: ['tired'], level: 3 },
    { any: ['proud', 'satisfied'], level: 1 },
  ],
  alsoFine: ['content'],
  forbidden: ['sad'],
  unmatched: [],
  tags: ['mixed'],
  labelledBy: 'test',
};

describe('scoreCase', () => {
  it('fills slots, counts levels, and separates extra from neutral words', () => {
    const score = scoreCase(proudWiped, { words: [word('tired', 3), word('satisfied', 3), word('content'), word('sad')], unmatched: [] });
    expect(score).toMatchObject({ slots: 2, filled: 2, extra: ['sad'], neutral: ['content'], forbidden: ['sad'], levelScored: 2, levelExact: 1, farMisses: 1, exact: false });
  });

  it('lets each slot take one word, so a second synonym is extra', () => {
    const score = scoreCase(proudWiped, { words: [word('proud', 1), word('satisfied', 1)], unmatched: [] });
    expect(score.filled).toBe(1);
    expect(score.extra).toEqual(['satisfied']);
  });

  it('gives a word to the slot that needs it when two slots could take it', () => {
    const c: FeelingCase = { ...proudWiped, expected: [{ any: ['anxious', 'overwhelmed'] }, { any: ['anxious'] }] };
    expect(scoreCase(c, { words: [word('anxious'), word('overwhelmed')], unmatched: [] }).filled).toBe(2);
  });

  it('counts their own words found', () => {
    const c: FeelingCase = { ...proudWiped, expected: [], unmatched: ['relieved', 'meh'] };
    expect(scoreCase(c, { words: [], unmatched: [{ said: 'Relieved', evidence: 'relieved' }] })).toMatchObject({ unmatchedExpected: 2, unmatchedFound: 1, exact: true });
  });
});

describe('summarize', () => {
  it('reports precision, recall, over-labelling on events-only cases and forbidden words', () => {
    const events: FeelingCase = { ...proudWiped, id: 'events', expected: [], alsoFine: [], forbidden: [], tags: ['events-only'] };
    const summary = summarize([
      scoreCase(proudWiped, { words: [word('tired', 3), word('proud', 1, 0.95)], unmatched: [] }),
      scoreCase(events, { words: [word('anxious', 2, 0.4)], unmatched: [] }),
    ]);
    expect(summary).toMatchObject({ cases: 2, precision: 2 / 3, recall: 1, exactRate: 0.5, levelExactRate: 1, eventsOnlyWithWords: { count: 1, of: 1 }, forbiddenCases: [] });
    expect(summary.f1).toBeCloseTo(0.8);
    expect(summary.bands.find((b) => b.band === '< 0.5')).toEqual({ band: '< 0.5', words: 1, precision: 0 });
  });
});

describe('percentile', () => {
  it('uses the nearest rank', () => {
    expect(percentile([300, 100, 200, 400], 50)).toBe(200);
    expect(percentile([300, 100, 200, 400], 95)).toBe(400);
    expect(percentile([], 50)).toBeNull();
  });
});

describe('the case files', () => {
  it('parse, with no word both expected and forbidden', () => {
    const cases = parseFeelingCases(load('./feelings/cases.json'));
    expect(cases.length).toBeGreaterThanOrEqual(40);
    expect(new Set(cases.flatMap((c) => c.tags))).toEqual(
      new Set(['clear', 'mixed', 'out-of-vocabulary', 'intensity', 'negation', 'sarcasm', 'events-only', 'body', 'hyperbole', 'implicit', 'face-conflict', 'short', 'long', 'injection', 'slang']),
    );
  });
});

// The CI gate for the crisis screen: a crisis case that stops showing resources fails the build.
describe('the safety screen on the safety set', () => {
  const cases = parseSafetyCases(load('./safety/cases.json'));
  const screen = new PhraseSafetyScreen();
  const summary = summarizeSafety(cases, (c) => screen.screen(c.text).show);

  it('shows resources for every crisis case', () => {
    expect(summary.misses).toEqual([]);
  });

  it('stays quiet on hyperbole and ordinary sadness', () => {
    expect(summary.falsePositives).toEqual([]);
  });
});
