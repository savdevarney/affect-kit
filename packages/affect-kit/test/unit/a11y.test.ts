import { describe, expect, it } from 'vitest';
import {
  A11Y_STRINGS_EN, FACE_STEPS, axisValueText, chipA11y, chipLabel, describeFace, nudgeFace, type A11yStrings,
} from '../../src/core/a11y';

describe('the bands', () => {
  it('read the nine steps as design set them', () => {
    expect(FACE_STEPS.map(v => axisValueText('pleasant', { v, a: 0 }))).toEqual([
      'very unpleasant', 'very unpleasant', 'unpleasant', 'unpleasant', 'neither',
      'pleasant', 'pleasant', 'very pleasant', 'very pleasant',
    ]);
    expect(FACE_STEPS.map(a => axisValueText('energized', { v: 0, a }))).toEqual([
      'very calm', 'very calm', 'calm', 'calm', 'neither',
      'energized', 'energized', 'very energized', 'very energized',
    ]);
  });

  it('read an unset face as not set', () => {
    expect(axisValueText('pleasant', null)).toBe('not set');
    expect(A11Y_STRINGS_EN.faceNotSet).toBe('Face, not set');
  });
});

describe('describeFace', () => {
  it('joins the two axes', () => {
    expect(describeFace(0.5, -0.75)).toBe('pleasant, very calm');
    expect(describeFace(0, 0)).toBe('neither, neither');
  });

  it("takes an app's own words", () => {
    const strings: A11yStrings = {
      ...A11Y_STRINGS_EN,
      pleasantBands: ['low', 'mid', 'high'],
      energizedBands: ['still', 'lively'],
      joiner: ' / ',
    };
    expect(describeFace(-0.9, 0.9, strings)).toBe('low / lively');
  });
});

describe('nudgeFace', () => {
  it('steps one stop on one axis', () => {
    expect(nudgeFace({ v: 0.25, a: -0.5 }, 'pleasant', 1)).toEqual({ v: 0.5, a: -0.5 });
    expect(nudgeFace({ v: 0.25, a: -0.5 }, 'energized', -1)).toEqual({ v: 0.25, a: -0.75 });
  });

  it('starts an unset face from the centre', () => {
    expect(nudgeFace(null, 'pleasant', 1)).toEqual({ v: 0.25, a: 0 });
  });

  it('moves a dragged face to the next stop past it', () => {
    expect(nudgeFace({ v: 0.3, a: 0 }, 'pleasant', 1).v).toBe(0.5);
    expect(nudgeFace({ v: 0.3, a: 0 }, 'pleasant', -1).v).toBe(0.25);
  });

  it('stays at either end', () => {
    expect(nudgeFace({ v: 1, a: 0 }, 'pleasant', 1).v).toBe(1);
    expect(nudgeFace({ v: 0, a: -1 }, 'energized', -1).a).toBe(-1);
  });
});

describe('chipLabel', () => {
  it('reads the level in words', () => {
    expect(chipLabel('anxious', 0)).toBe('anxious');
    expect(chipLabel('anxious', 1)).toBe('anxious, a little');
    expect(chipLabel('anxious', 2)).toBe('anxious, clearly');
    expect(chipLabel('anxious', 3)).toBe('anxious, strongly');
  });
});

describe('chipA11y', () => {
  it('reads a chip as a toggle: off when unchosen, on with its level when chosen', () => {
    expect(chipA11y('anxious', 0)).toEqual({ label: 'anxious', selected: false });
    expect(chipA11y('anxious', 2)).toEqual({ label: 'anxious, clearly', selected: true });
  });
});
