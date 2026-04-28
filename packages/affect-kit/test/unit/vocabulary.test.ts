import { describe, it, expect } from 'vitest';
import { EMOTIONS, EMOTIONS_BY_NAME } from '../../src/vocabulary/en';

describe('EMOTIONS array', () => {
  it('has 56 entries', () => {
    expect(EMOTIONS).toHaveLength(56);
  });

  it('every entry has a non-empty name', () => {
    for (const e of EMOTIONS) {
      expect(e.name.length).toBeGreaterThan(0);
    }
  });

  it('all names are unique', () => {
    const names = EMOTIONS.map(e => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all v, a, d values are in [-1, 1]', () => {
    for (const e of EMOTIONS) {
      expect(e.v).toBeGreaterThanOrEqual(-1);
      expect(e.v).toBeLessThanOrEqual(1);
      expect(e.a).toBeGreaterThanOrEqual(-1);
      expect(e.a).toBeLessThanOrEqual(1);
      expect(e.d).toBeGreaterThanOrEqual(-1);
      expect(e.d).toBeLessThanOrEqual(1);
    }
  });

  it('spot-check: joy has positive V and positive A', () => {
    const joy = EMOTIONS.find(e => e.name === 'joy');
    expect(joy).toBeDefined();
    expect(joy!.v).toBeGreaterThan(0);
    expect(joy!.a).toBeGreaterThan(0);
  });

  it('spot-check: calm has positive V and negative A', () => {
    const calm = EMOTIONS.find(e => e.name === 'calm');
    expect(calm).toBeDefined();
    expect(calm!.v).toBeGreaterThan(0);
    expect(calm!.a).toBeLessThan(0);
  });

  it('spot-check: anger has negative V and positive A', () => {
    const anger = EMOTIONS.find(e => e.name === 'anger');
    expect(anger).toBeDefined();
    expect(anger!.v).toBeLessThan(0);
    expect(anger!.a).toBeGreaterThan(0);
  });

  it('spot-check: sad has negative V and negative A', () => {
    const sad = EMOTIONS.find(e => e.name === 'sad');
    expect(sad).toBeDefined();
    expect(sad!.v).toBeLessThan(0);
    expect(sad!.a).toBeLessThan(0);
  });
});

describe('EMOTIONS_BY_NAME map', () => {
  it('has the same size as EMOTIONS', () => {
    expect(EMOTIONS_BY_NAME.size).toBe(EMOTIONS.length);
  });

  it('every emotion name resolves to its entry', () => {
    for (const e of EMOTIONS) {
      expect(EMOTIONS_BY_NAME.get(e.name)).toBe(e);
    }
  });

  it('returns undefined for unknown names', () => {
    expect(EMOTIONS_BY_NAME.get('nonexistent')).toBeUndefined();
    expect(EMOTIONS_BY_NAME.get('')).toBeUndefined();
  });

  it('calm lookup matches expected VAD values', () => {
    const calm = EMOTIONS_BY_NAME.get('calm');
    expect(calm?.v).toBeCloseTo(0.46, 5);
    expect(calm?.a).toBeCloseTo(-0.65, 5);
    expect(calm?.d).toBeCloseTo(0.25, 5);
  });
});
