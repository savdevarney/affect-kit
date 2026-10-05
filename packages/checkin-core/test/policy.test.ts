import { describe, expect, it } from 'vitest';
import { finalize, isGrounded, reviewDiff, suggestions } from '../src/policy.ts';
import type { FoundWord, IdFactory, StoredWord } from '../src/ports.ts';

const word = (name: FoundWord['name'], evidence: string, level: FoundWord['level'] = 2, confidence = 0.8): FoundWord => ({ name, level, evidence, confidence });

describe('isGrounded', () => {
  it('finds evidence regardless of case, curly quotes and spacing', () => {
    expect(isGrounded('I’m  SO tired', "i'm so tired")).toBe(true);
  });
  it('rejects evidence that is not in the text, and empty evidence', () => {
    expect(isGrounded('Long day.', 'exhausted')).toBe(false);
    expect(isGrounded('Long day.', '  ')).toBe(false);
  });
  it('matches whole words only, and nothing too short to mean anything', () => {
    expect(isGrounded('Meetings all day, then made dinner.', 'mad')).toBe(false);
    expect(isGrounded('Meetings all day, then made dinner.', 'a')).toBe(false);
    expect(isGrounded('So mad at the landlord', 'mad')).toBe(true);
  });
});

describe('finalize', () => {
  const text = 'Presentation went fine but I’m wiped. Kind of proud though, and a bit relieved.';

  it('drops words whose evidence is not in their text', () => {
    const result = finalize(text, { words: [word('tired', 'wiped', 3), word('joy', 'thrilled')], unmatched: [] });
    expect(result.words.map((w) => w.name)).toEqual(['tired']);
    expect(result.dropped.ungrounded).toBe(1);
  });

  it('takes the evidence from the entry that sets the level', () => {
    const result = finalize('Kind of tired this morning, so tired now.', {
      words: [word('tired', 'Kind of tired', 1, 0.9), word('tired', 'so tired', 3, 0.7)],
      unmatched: [],
    });
    expect(result.words).toEqual([{ name: 'tired', level: 3, evidence: 'so tired', confidence: 0.9 }]);
  });

  it('merges a repeated word, keeping the stronger level and higher confidence', () => {
    const result = finalize(text, { words: [word('proud', 'Kind of proud', 1, 0.6), word('proud', 'proud', 2, 0.9)], unmatched: [] });
    expect(result.words).toEqual([{ name: 'proud', level: 2, evidence: 'proud', confidence: 0.9 }]);
    expect(result.dropped.merged).toBe(1);
  });

  it('keeps at most five words, most confident first', () => {
    const many = 'anxious sad tired lonely bored empty numb';
    const proposal = { words: ['anxious', 'sad', 'tired', 'lonely', 'bored', 'empty', 'numb'].map((n, i) => word(n as FoundWord['name'], n, 2, 0.5 + i * 0.05)), unmatched: [] };
    const result = finalize(many, proposal);
    expect(result.words).toHaveLength(5);
    expect(result.words[0]!.name).toBe('numb');
    expect(result.dropped.overCap).toBe(2);
  });

  it('keeps their own word only when it is grounded, new, and not a vocabulary word', () => {
    const result = finalize(text, {
      words: [word('tired', 'wiped', 3)],
      unmatched: [
        { said: 'Relieved', evidence: 'a bit relieved' },
        { said: 'relieved', evidence: 'relieved' },
        { said: 'proud', evidence: 'proud' },
        { said: 'wiped', evidence: 'wiped' },
        { said: 'elated', evidence: 'elated' },
      ],
    });
    expect(result.unmatched).toEqual([{ said: 'relieved', evidence: 'a bit relieved' }]);
  });

  it('never shows model-written text as their own word', () => {
    const result = finalize('Such a relief. Somehow anxious, and meh.', {
      words: [word('anxious', 'Somehow anxious')],
      unmatched: [
        { said: 'relieved', evidence: 'Such a relief' }, // a word they didn't write
        { said: 'You should talk to someone about this', evidence: 'relief' }, // a model's sentence
        { said: 'meh', evidence: 'meh' }, // theirs, and "Somehow" doesn't contain it as a word
      ],
    });
    expect(result.unmatched).toEqual([{ said: 'meh', evidence: 'meh' }]);
  });
});

describe('suggestions', () => {
  it('offers words near the face only when nothing came through', () => {
    expect(suggestions({ v: 0.7, a: -0.9 }, [])).toEqual(['relaxed', 'peaceful', 'calm']);
    expect(suggestions({ v: 0.7, a: -0.9 }, [word('tired', 'tired')])).toEqual([]);
  });
});

describe('reviewDiff', () => {
  let n = 0;
  const ids: IdFactory = { next: () => `id-${++n}` };
  const stored = (name: StoredWord['name'], level: StoredWord['level']): StoredWord => ({ id: `w-${name}`, name, level, source: 'model', runId: 'run-1', evidence: name, confidence: 0.8 });
  const current = [stored('tired', 3), stored('proud', 2), stored('anxious', 1)];
  const now = new Date('2026-10-05T18:30:00Z');

  it('records kept, level changed, removed and added, superseding instead of editing', () => {
    const change = reviewDiff({ current, final: [{ name: 'tired', level: 3 }, { name: 'proud', level: 3 }, { name: 'grateful', level: 2 }], firstReview: true, ids, now });
    expect(change.supersede.sort()).toEqual(['w-anxious', 'w-proud']);
    expect(change.insert.map((w) => [w.name, w.level, w.source])).toEqual([
      ['proud', 3, 'person'],
      ['grateful', 2, 'person'],
    ]);
    expect(change.feedback.map((f) => [f.action, f.name, f.fromLevel, f.toLevel])).toEqual([
      ['kept', 'tired', 3, 3],
      ['level_changed', 'proud', 2, 3],
      ['removed', 'anxious', 1, null],
      ['added', 'grateful', null, 2],
    ]);
    expect(change.reviewedAt).toBe('2026-10-05T18:30:00.000Z');
  });

  it('keeps the evidence on a word whose level changed: their words still support it', () => {
    const change = reviewDiff({ current, final: [{ name: 'proud', level: 3 }], firstReview: true, ids, now });
    expect(change.insert[0]).toMatchObject({ name: 'proud', evidence: 'proud', runId: 'run-1', confidence: null });
  });

  it('records "kept" on the first review only', () => {
    const change = reviewDiff({ current, final: current.map(({ name, level }) => ({ name, level })), firstReview: false, ids, now });
    expect(change.feedback).toEqual([]);
    expect(change.supersede).toEqual([]);
  });
});
