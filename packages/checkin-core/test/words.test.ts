import { describe, expect, it } from 'vitest';
import { BANNED_IN_OUR_VOICE, chipLabel, COPY, daysLine } from '../src/words.ts';
import { CRISIS_COPY, CRISIS_LINES } from '../src/safety/resources.ts';
import { EMOTION_NAMES, nearestWords, readingOrder, VOCABULARY_ID } from '../src/vocabulary.ts';

/** Every string in the copy, however deep. */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

describe('the wording rules (docs/checkin/visualizations.md § 2)', () => {
  it.each(BANNED_IN_OUR_VOICE)('our copy never says "%s"', (banned) => {
    const offending = strings([COPY, CRISIS_COPY, CRISIS_LINES]).filter((s) => new RegExp(`\\b${banned}`, 'i').test(s));
    expect(offending).toEqual([]);
  });

  it('describes counts with their denominator, never as a share', () => {
    expect(daysLine('calm', 4, 7)).toBe('calm on 4 of 7 days');
    expect(daysLine('calm', 1, 1)).toBe('calm on 1 of 1 day');
  });

  it('names a chip for screen readers', () => {
    expect(chipLabel('anxious', 3)).toBe('anxious, strongly');
  });
});

describe('the vocabulary', () => {
  it('is affect-kit’s 55 words, with a content id', () => {
    expect(EMOTION_NAMES).toHaveLength(55);
    expect(VOCABULARY_ID).toMatch(/^en-55-[0-9a-f]{8}$/);
  });

  it('sorts like the rater: nearest the face first', () => {
    expect(nearestWords({ v: -0.8, a: 0.9 }, 2)).toEqual(['panicked', 'enraged']);
  });

  it('orders a list of words pleasant to unpleasant', () => {
    expect(readingOrder(['sad', 'joy', 'calm'])).toEqual(['joy', 'calm', 'sad']);
  });
});
