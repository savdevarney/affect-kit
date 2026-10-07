import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { suggestLabels } from '../../src/vocabulary/suggest';

interface Note {
  id: number;
  text: string;
  primary: Array<{ name: string; level: number | null }>;
  also: string[];
  avoid: string[];
}

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/feeling-notes');
const load = (file: string): Note[] => JSON.parse(readFileSync(resolve(FIXTURES, file), 'utf8'));

// varia's 50 notes drove which words went into SYNONYMS_EN; the held-out 22 were
// written before suggestLabels ran on them, so they say whether the rules
// generalize or just fit the first set.
const VARIA = load('varia-notes.json');
const HELD_OUT = load('held-out-notes.json');

interface Score {
  withGold: number;       // notes with a feeling in them
  covered: number;        // ...where at least one acceptable word was suggested
  levelJudged: number;
  levelRight: number;
  negatedSuggested: number;
  quietN: number;         // notes with no clear feeling
  quiet: number;          // ...where nothing off-target was suggested
}

function score(notes: Note[]): Score {
  const r: Score = { withGold: 0, covered: 0, levelJudged: 0, levelRight: 0, negatedSuggested: 0, quietN: 0, quiet: 0 };
  for (const note of notes) {
    const got = suggestLabels(note.text);
    const acceptable = new Set([...note.primary.map(p => p.name), ...note.also]);
    r.negatedSuggested += got.filter(g => note.avoid.includes(g.name)).length;
    if (note.primary.length === 0) {
      r.quietN++;
      if (got.every(g => acceptable.has(g.name))) r.quiet++;
      continue;
    }
    r.withGold++;
    if (got.some(g => acceptable.has(g.name))) r.covered++;
    for (const p of note.primary) {
      const hit = got.find(g => g.name === p.name);
      if (hit && p.level !== null) {
        r.levelJudged++;
        if (hit.level === p.level) r.levelRight++;
      }
    }
  }
  return r;
}

describe('suggestLabels', () => {
  it('suggests a label, its level and how directly it was named', () => {
    expect(suggestLabels('Really stressed')).toEqual([
      { name: 'overwhelmed', level: 3, confidence: 'medium', synonym: 'stressed' },
    ]);
    expect(suggestLabels('Feeling a bit tired')).toEqual([{ name: 'tired', level: 1, confidence: 'high' }]);
    expect(suggestLabels('Anxious')).toEqual([{ name: 'anxious', level: 2, confidence: 'high' }]);
  });

  it('skips a negated word, within its clause', () => {
    expect(suggestLabels('Not stressed at all')).toEqual([]);
    expect(suggestLabels("I'm not sad. Just tired")).toEqual([{ name: 'tired', level: 2, confidence: 'high' }]);
    expect(suggestLabels("I'm not sure, but I feel sad")).toEqual([{ name: 'sad', level: 2, confidence: 'high' }]);
  });

  it('lists labels in the order they appear, each once, with the first mention winning', () => {
    expect(suggestLabels('Stressed but grateful. So stressed, honestly happy too').map(s => s.name))
      .toEqual(['overwhelmed', 'grateful', 'joy']);
  });

  it('lowers confidence when the match is hedged', () => {
    expect(suggestLabels('maybe a bit anxious')[0]).toMatchObject({ name: 'anxious', level: 1, confidence: 'low' });
    expect(suggestLabels('it was fine, I guess')[0]).toMatchObject({ name: 'content', confidence: 'medium' });
    expect(suggestLabels('I guess I feel sad')[0]).toMatchObject({ name: 'sad', confidence: 'low' });
  });

  it('handles curly apostrophes, case and hyphens', () => {
    expect(suggestLabels('I’m NOT stressed')).toEqual([]);
    expect(suggestLabels('totally worn-out')[0]).toMatchObject({ name: 'tired', synonym: 'worn' });
  });

  it('matches whole words and ignores Object.prototype keys', () => {
    expect(suggestLabels('sadly safety madness')).toEqual([]);
    expect(suggestLabels('constructor toString hasOwnProperty')).toEqual([]);
    expect(suggestLabels('')).toEqual([]);
  });
});

const pct = (n: number, of: number) => n / of;

describe('suggestLabels on feeling notes', () => {
  const varia = score(VARIA);
  const heldOut = score(HELD_OUT);

  it('never suggests a word the person negated, and stays quiet when no feeling is named', () => {
    for (const s of [varia, heldOut]) {
      expect(s.negatedSuggested).toBe(0);
      expect(s.quiet).toBe(s.quietN);
    }
  });

  it('finds a fitting word for most notes (varia: 35 of 47)', () => {
    expect(pct(varia.covered, varia.withGold)).toBeGreaterThanOrEqual(0.7);
  });

  it('does no worse on notes written after the rules and word list were fixed (held-out: 18 of 21)', () => {
    expect(pct(heldOut.covered, heldOut.withGold)).toBeGreaterThanOrEqual(pct(varia.covered, varia.withGold) - 0.05);
  });

  it('gets levels right where the rules apply (varia: 36 of 38)', () => {
    expect(pct(varia.levelRight, varia.levelJudged)).toBeGreaterThanOrEqual(0.9);
  });

  // The held-out set is where levels fall short: 15 of 19. The misses are "fine" and
  // "trying to stay calm" (judged faint, scored 2) and "ugh" (read as an intensifier).
  // This floor pins what was measured; raising it means better rules, not a looser set.
  it('gets levels right on held-out notes at least 75% of the time', () => {
    expect(pct(heldOut.levelRight, heldOut.levelJudged)).toBeGreaterThanOrEqual(0.75);
  });

  // Known limitation, kept visible: "never been so X" is an intensifier, not a negation.
  // it.fails passes while this is wrong and fails the day it's fixed, so the fix removes it.
  it.fails('does not treat "never been so frustrated" as a negation', () => {
    expect(suggestLabels('Never been so frustrated with a project.').map(s => s.name)).toContain('frustrated');
  });
});
