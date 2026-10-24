import { describe, expect, it } from 'vitest';
import { APPLE_LABEL_OF_WORD, appleLabelsFor, stateOfMind } from '../../src/apple-health';
import { createRating } from '../../src/core/vad';
import { EMOTION_LABELS, type EmotionName } from '../../src/vocabulary/en';

// Apple's adjective for a noun-form word. Every other mapped word is the word itself.
const ADJECTIVE: Partial<Record<EmotionName, string>> = {
  anger: 'angry', fear: 'scared', disgust: 'disgusted', joy: 'joyful', surprise: 'surprised',
};

describe('APPLE_LABEL_OF_WORD', () => {
  it('maps a word only to itself or its plain adjective: no forced nearest fit', () => {
    for (const [word, label] of Object.entries(APPLE_LABEL_OF_WORD)) {
      expect(label, word).toBe(ADJECTIVE[word as EmotionName] ?? word);
    }
  });

  it('never writes serene as peaceful', () => {
    expect(APPLE_LABEL_OF_WORD.serene).toBeUndefined();
    expect(appleLabelsFor(['serene'])).toEqual([]);
  });

  it('maps only vocabulary words', () => {
    for (const word of Object.keys(APPLE_LABEL_OF_WORD)) expect(EMOTION_LABELS).toHaveProperty(word);
  });
});

describe('appleLabelsFor', () => {
  it('keeps the order chosen, each label once, and leaves out words with none', () => {
    expect(appleLabelsFor(['joy', 'serene', 'calm', 'joy'])).toEqual(['joyful', 'calm']);
  });

  it('ignores case and spaces', () => {
    expect(appleLabelsFor([' Anger '])).toEqual(['angry']);
  });
});

describe('stateOfMind', () => {
  it("writes the face's valence and the words' labels", () => {
    const rating = createRating({ face: { v: 0.4, a: -0.2 }, labels: [{ name: 'calm', level: 2 }, { name: 'serene', level: 1 }] });
    expect(stateOfMind(rating)).toEqual({ kind: 'momentaryEmotion', valence: 0.4, valenceFrom: 'face', labels: ['calm'] });
  });

  it('writes a face alone as a valence with no labels', () => {
    expect(stateOfMind(createRating({ face: { v: -0.3, a: 0.1 } }), 'dailyMood')).toEqual({
      kind: 'dailyMood', valence: -0.3, valenceFrom: 'face', labels: [],
    });
  });

  it("takes the words' valence when the face wasn't set, and says so", () => {
    const sample = stateOfMind(createRating({ labels: [{ name: 'calm', level: 2 }] }));
    expect(sample?.valenceFrom).toBe('words');
    expect(sample?.valence).toBeCloseTo(EMOTION_LABELS.calm.v);
    expect(sample?.labels).toEqual(['calm']);
  });

  it('writes nothing for a rating with neither a face nor words', () => {
    expect(stateOfMind(createRating({}))).toBeNull();
  });
});
