import { describe, it, expect } from 'vitest';
import { EMOTIONS, EMOTION_LABELS, EMOTIONS_BY_NAME } from '../../src/vocabulary/en';
import { SYNONYMS_EN } from '../../src/vocabulary/synonyms-en';
import { nearestLabels, completeLabels } from '../../src/vocabulary/search';

describe('nearestLabels', () => {
  it('returns every label, closest first', () => {
    const names = nearestLabels(0.3, -0.2);
    expect(names).toHaveLength(EMOTIONS.length);
    expect(new Set(names).size).toBe(EMOTIONS.length);
    const dist = (n: (typeof names)[number]) =>
      Math.hypot(EMOTION_LABELS[n].v - 0.3, EMOTION_LABELS[n].a + 0.2);
    for (let i = 1; i < names.length; i++) {
      expect(dist(names[i]!)).toBeGreaterThanOrEqual(dist(names[i - 1]!));
    }
  });

  it('puts a label first when the point sits on it', () => {
    for (const e of EMOTIONS) expect(nearestLabels(e.v, e.a, 1)).toEqual([e.name]);
  });

  it('limits to n', () => {
    expect(nearestLabels(0.8, 0.7, 3)).toEqual(['surprise', 'amused', 'excited']);
    expect(nearestLabels(0, 0, 0)).toEqual([]);
  });
});

describe('SYNONYMS_EN', () => {
  it('maps every word to a real label', () => {
    for (const [word, name] of Object.entries(SYNONYMS_EN)) {
      expect(EMOTIONS_BY_NAME.has(name), `${word} → ${name}`).toBe(true);
    }
  });

  it('keys are lowercase single words and never labels themselves', () => {
    for (const word of Object.keys(SYNONYMS_EN)) {
      expect(word).toMatch(/^[a-z]+$/);
      expect(EMOTIONS_BY_NAME.has(word), word).toBe(false);
    }
  });

  it('includes the starting set', () => {
    expect(SYNONYMS_EN['stressed']).toBe('overwhelmed');
    expect(SYNONYMS_EN['happy']).toBe('joy');
    expect(SYNONYMS_EN['homesick']).toBe('nostalgic');
    expect(SYNONYMS_EN['irritated']).toBe('annoyed');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(SYNONYMS_EN)).toBe(true);
  });
});

describe('completeLabels', () => {
  it('offers a label through a synonym', () => {
    expect(completeLabels('stre', -0.4, 0.5)).toEqual([{ name: 'overwhelmed', synonym: 'stress' }]);
    expect(completeLabels('stresse', -0.4, 0.5)).toEqual([{ name: 'overwhelmed', synonym: 'stressed' }]);
  });

  it('orders matches by distance to the face', () => {
    // 'hope' matches hopeful (pleasant) and hopeless (unpleasant).
    expect(completeLabels('hope', 0.9, -0.3).map(m => m.name)).toEqual(['hopeful', 'hopeless']);
    expect(completeLabels('hope', -0.8, -0.4).map(m => m.name)).toEqual(['hopeless', 'hopeful']);
  });

  it('mixes direct and synonym matches in one order, each label once', () => {
    // 'sa' starts sad, safe, satisfied directly; no synonym starts with 'sa'.
    const sa = completeLabels('sa', 0, 0);
    expect(sa.map(m => m.name).sort()).toEqual(['sad', 'safe', 'satisfied']);
    expect(sa.every(m => m.synonym === undefined)).toBe(true);
    // 'gr' starts grateful directly and also 'gratitude' → grateful: listed once, as itself.
    const gr = completeLabels('gr', 0, 0).filter(m => m.name === 'grateful');
    expect(gr).toEqual([{ name: 'grateful' }]);
    // 'great' → joy joins through the synonym.
    expect(completeLabels('gr', 0, 0)).toContainEqual({ name: 'joy', synonym: 'great' });
  });

  it('ignores case and surrounding spaces', () => {
    expect(completeLabels('  Stre ', 0, 0)).toEqual(completeLabels('stre', 0, 0));
  });

  it('returns every label in face order for an empty prefix', () => {
    expect(completeLabels('', 0.2, 0.2).map(m => m.name)).toEqual(nearestLabels(0.2, 0.2));
  });

  it('returns nothing when nothing matches', () => {
    expect(completeLabels('xyz', 0, 0)).toEqual([]);
  });
});
