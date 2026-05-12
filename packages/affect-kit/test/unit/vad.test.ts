import { describe, it, expect } from 'vitest';
import { computeComposite, buildRating, createRating, stripVad, rehydrate } from '../../src/core/vad';
import type { Rating } from '../../src/core/types';

describe('computeComposite', () => {
  it('returns null when no labels are active', () => {
    expect(computeComposite([])).toBeNull();
  });

  it('returns emotion VAD for a single level-3 label', () => {
    // 'calm' from NRC VAD v2.1: { v: 0.75, a: -0.90, d: -0.373 }
    const result = computeComposite([
      { name: 'calm', level: 3, vad: { v: 0.750, a: -0.900, d: -0.373 } },
    ]);
    expect(result).not.toBeNull();
    expect(result!.v).toBeCloseTo(0.750, 3);
    expect(result!.a).toBeCloseTo(-0.900, 3);
    expect(result!.d).toBeCloseTo(-0.373, 3);
  });

  it('weights level-1 as 1/3 of level-3 (single label cancels out)', () => {
    const vad = { v: 0.960, a: 0.648, d: 0.588 };
    const l3 = computeComposite([{ name: 'joy', level: 3, vad }]);
    const l1 = computeComposite([{ name: 'joy', level: 1, vad }]);
    expect(l1!.v).toBeCloseTo(l3!.v, 5);
    expect(l1!.a).toBeCloseTo(l3!.a, 5);
  });

  it('averages two equal-level labels correctly', () => {
    const result = computeComposite([
      { name: 'joy',  level: 3, vad: { v: 0.960, a: 0.648, d: 0.588 } },
      { name: 'calm', level: 3, vad: { v: 0.750, a: -0.900, d: -0.373 } },
    ]);
    expect(result!.v).toBeCloseTo((0.960 + 0.750) / 2, 5);
  });

  it('weights higher-level labels more heavily', () => {
    const result = computeComposite([
      { name: 'joy',  level: 3, vad: { v: 0.960, a: 0.648, d: 0.588 } },
      { name: 'calm', level: 1, vad: { v: 0.750, a: -0.900, d: -0.373 } },
    ]);
    // joy weight=1, calm weight=1/3 → weighted avg: (0.960*1 + 0.750*(1/3)) / (1 + 1/3)
    const expected = (0.960 * 1 + 0.750 * (1 / 3)) / (1 + 1 / 3);
    expect(result!.v).toBeCloseTo(expected, 5);
  });
});

describe('buildRating', () => {
  it('returns a correctly shaped Rating with no labels', () => {
    const ts = 1_700_000_000_000;
    const rating = buildRating({ face: { v: 0.3, a: -0.4 }, labels: [], now: () => ts });
    expect(rating.face).toEqual({ v: 0.3, a: -0.4 });
    expect(rating.composite).toBeNull();
    expect(rating.labels).toEqual([]);
    expect(rating.timestamp).toBe(ts);
  });

  it('preserves face separately when labels override the composite, and enriches labels with VAD', () => {
    const rating = buildRating({
      face: { v: 0.1, a: 0.1 },
      labels: [{ name: 'calm', level: 3 }],
      now: () => 0,
    });
    expect(rating.face).toEqual({ v: 0.1, a: 0.1 });
    expect(rating.composite).not.toBeNull();
    expect(rating.composite!.v).toBeCloseTo(0.750, 3); // calm's v (NRC v2.1)
    // Label is enriched with VAD coordinates
    expect(rating.labels[0]!.vad!.v).toBeCloseTo(0.750, 3);
  });

  it('throws on unknown emotion names', () => {
    expect(() =>
      // @ts-expect-error — testing runtime validation against invalid name
      buildRating({ face: { v: 0, a: 0 }, labels: [{ name: 'made-up-feeling', level: 2 }] })
    ).toThrow(/unknown emotion name/i);
  });

  it('uses Date.now() by default (smoke test)', () => {
    const before = Date.now();
    const rating = buildRating({ face: { v: 0, a: 0 }, labels: [] });
    const after = Date.now();
    expect(rating.timestamp).toBeGreaterThanOrEqual(before);
    expect(rating.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('createRating', () => {
  it('builds a Rating from face position and labels', () => {
    const r = createRating({
      face: { v: 0.5, a: 0.3 },
      labels: [{ name: 'joy', level: 3 }],
    });
    expect(r.face).toEqual({ v: 0.5, a: 0.3 });
    expect(r.labels).toHaveLength(1);
    expect(r.labels[0]!.vad).toBeDefined();
    expect(r.composite).not.toBeNull();
  });

  it('throws on unknown emotion names', () => {
    expect(() =>
      createRating({
        face: { v: 0, a: 0 },
        // @ts-expect-error — testing runtime validation against invalid name
        labels: [{ name: 'not-a-real-emotion', level: 1 }],
      })
    ).toThrow(/unknown emotion name/i);
  });
});

describe('stripVad / rehydrate', () => {
  const full: Rating = createRating({
    face: { v: 0.5, a: 0.3 },
    labels: [
      { name: 'joy',     level: 3 },
      { name: 'hopeful', level: 2 },
    ],
  });

  it('stripVad removes vad from every label', () => {
    const lean = stripVad(full);
    expect(lean.labels).toHaveLength(2);
    expect(lean.labels.every(l => l.vad === undefined)).toBe(true);
    expect(lean.labels[0]!.name).toBe('joy');
    expect(lean.labels[0]!.level).toBe(3);
    // Other fields untouched
    expect(lean.face).toEqual(full.face);
    expect(lean.timestamp).toBe(full.timestamp);
    expect(lean.composite).toEqual(full.composite);
  });

  it('rehydrate fills vad back from the lexicon', () => {
    const lean = stripVad(full);
    const round = rehydrate(lean);
    expect(round.labels[0]!.vad).toEqual(full.labels[0]!.vad);
    expect(round.labels[1]!.vad).toEqual(full.labels[1]!.vad);
  });

  it('rehydrate is a no-op for labels that already have vad', () => {
    const round = rehydrate(full);
    expect(round.labels[0]!.vad).toEqual(full.labels[0]!.vad);
    // Same reference passes through when already hydrated
    expect(round.labels[0]).toBe(full.labels[0]);
  });

  it('computeComposite tolerates labels without inline vad', () => {
    const lean = stripVad(full).labels;
    const composite = computeComposite(lean);
    expect(composite).toEqual(full.composite);
  });
});
