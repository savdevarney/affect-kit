import { describe, it, expect } from 'vitest';
import { EMOTIONS, EMOTION_LABELS } from '../../src/vocabulary/en';
import { wordOrder } from '../../src/vocabulary/order';

describe('wordOrder', () => {
  it('returns every word, nearest first', () => {
    const names = wordOrder(0.3, -0.2);
    expect(names).toHaveLength(EMOTIONS.length);
    expect(new Set(names).size).toBe(EMOTIONS.length);
    const dist = (n: (typeof names)[number]) =>
      Math.hypot(EMOTION_LABELS[n].v - 0.3, EMOTION_LABELS[n].a + 0.2);
    for (let i = 1; i < names.length; i++) {
      expect(dist(names[i]!)).toBeGreaterThanOrEqual(dist(names[i - 1]!));
    }
  });

  it('puts a word first when the face sits on it', () => {
    for (const e of EMOTIONS) expect(wordOrder(e.v, e.a)[0]).toBe(e.name);
  });

  it('matches the rater at a known point', () => {
    expect(wordOrder(0.8, 0.7).slice(0, 3)).toEqual(['surprise', 'amused', 'excited']);
  });
});
