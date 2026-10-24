import { describe, expect, it } from 'vitest';
import {
  RATER_RULES, RATER_TIMING, canFinish, createRater, raterRating, raterReducer, tapShocks,
  type RaterEvent, type RaterState,
} from '../../src/core/rater';
import { createRating } from '../../src/core/vad';
import { wordOrder } from '../../src/vocabulary/order';
import { EMOTIONS } from '../../src/vocabulary/en';

const play = (events: RaterEvent[], from: RaterState = createRater()) => events.reduce(raterReducer, from);
const levels = (s: RaterState) => s.chosen.map(c => `${c.name}:${c.level}`);

describe('raterReducer: the face', () => {
  it('starts with no face, no words showing, and vocabulary order', () => {
    const s = createRater();
    expect(s.face).toBeNull();
    expect(s.revealed).toBe(false);
    expect(s.order).toEqual(EMOTIONS.map(e => e.name));
  });

  it('follows the finger without re-sorting, then re-sorts and shows the words on settle', () => {
    const moving = play([{ type: 'move', v: 0.6, a: 0.4 }]);
    expect(moving.face).toEqual({ v: 0.6, a: 0.4 });
    expect(moving.dragging).toBe(true);
    expect(moving.revealed).toBe(false);
    expect(moving.order).toEqual(createRater().order);

    const settled = raterReducer(moving, { type: 'settle' });
    expect(settled.dragging).toBe(false);
    expect(settled.revealed).toBe(true);
    expect(settled.order).toEqual(wordOrder(0.6, 0.4));
  });

  it('clamps the face to the pad', () => {
    expect(play([{ type: 'move', v: 2, a: -3 }]).face).toEqual({ v: 1, a: -1 });
  });

  it('steps the face for a screen reader, from the centre when unset, and re-sorts', () => {
    const s = play([{ type: 'adjust', axis: 'pleasant', direction: 1 }]);
    expect(s.face).toEqual({ v: 0.25, a: 0 });
    expect(s.revealed).toBe(true);
    expect(s.order).toEqual(wordOrder(0.25, 0));
  });

  it('shows the words without the face, leaving it unset', () => {
    const s = play([{ type: 'showWords' }, { type: 'tap', name: 'calm' }]);
    expect(s.face).toBeNull();
    expect(s.revealed).toBe(true);
    expect(s.order).toEqual(createRater().order);
    expect(raterRating(s).face).toBeNull();
  });
});

describe('raterReducer: the words', () => {
  const shown = play([{ type: 'move', v: 0.3, a: 0.2 }, { type: 'settle' }]);

  it('cycles a word 0 → 1 → 2 → 3 → 0', () => {
    const taps = (n: number) => play(Array.from({ length: n }, () => ({ type: 'tap', name: 'joy' }) as const), shown);
    expect([1, 2, 3, 4].map(n => levels(taps(n)))).toEqual([['joy:1'], ['joy:2'], ['joy:3'], []]);
  });

  it('keeps the order words were first chosen; a word chosen again goes last', () => {
    const s = play([
      { type: 'tap', name: 'joy' }, { type: 'tap', name: 'calm' },
      { type: 'tap', name: 'joy' }, { type: 'tap', name: 'joy' }, { type: 'tap', name: 'joy' }, // joy off
      { type: 'tap', name: 'joy' },                                                           // joy again
    ], shown);
    expect(levels(s)).toEqual(['calm:1', 'joy:1']);
  });

  it('refuses a sixth word, but never refuses raising a chosen one', () => {
    const five = play(['joy', 'calm', 'proud', 'tired', 'hopeful'].map(name => ({ type: 'tap', name }) as RaterEvent), shown);
    expect(five.chosen).toHaveLength(RATER_RULES.maxWords);
    expect(raterReducer(five, { type: 'tap', name: 'sad' })).toBe(five);
    expect(levels(raterReducer(five, { type: 'tap', name: 'joy' }))[0]).toBe('joy:2');
    // Cycling one off frees its place.
    const freed = play([{ type: 'tap', name: 'joy' }, { type: 'tap', name: 'joy' }, { type: 'tap', name: 'joy' }], five);
    expect(raterReducer(freed, { type: 'tap', name: 'sad' }).chosen).toHaveLength(5);
  });

  it('waits for a word before Done', () => {
    expect(canFinish(shown)).toBe(false);
    expect(canFinish(raterReducer(shown, { type: 'tap', name: 'calm' }))).toBe(true);
  });

  it('shocks the face when a high-energy word goes up a level, not a calm one', () => {
    const excited = raterReducer(shown, { type: 'tap', name: 'excited' });
    expect(tapShocks(shown, excited)).toBe(true);
    expect(tapShocks(shown, raterReducer(shown, { type: 'tap', name: 'calm' }))).toBe(false);
    // Cycling from 3 back to 0 lowers it: no shock.
    const atThree = play([{ type: 'tap', name: 'excited' }, { type: 'tap', name: 'excited' }], excited);
    expect(tapShocks(atThree, raterReducer(atThree, { type: 'tap', name: 'excited' }))).toBe(false);
  });
});

describe('raterReducer: saved ratings', () => {
  it('opens a saved rating, with whole levels', () => {
    const s = raterReducer(createRater(), {
      type: 'load',
      rating: createRating({ face: { v: -0.4, a: 0.5 }, labels: [{ name: 'anxious', level: 2.6 }] }),
    });
    expect(s.face).toEqual({ v: -0.4, a: 0.5 });
    expect(levels(s)).toEqual(['anxious:3']);
    expect(s.order).toEqual(wordOrder(-0.4, 0.5));
  });

  it('opens a rating with no face in vocabulary order', () => {
    const s = raterReducer(createRater(), { type: 'load', rating: createRating({ labels: [{ name: 'calm', level: 1 }] }) });
    expect(s.face).toBeNull();
    expect(s.order).toEqual(createRater().order);
  });

  it('saves the face it has, and null rather than the centre when unset', () => {
    const set = play([{ type: 'move', v: 0.5, a: -0.5 }, { type: 'settle' }, { type: 'tap', name: 'calm' }]);
    expect(raterRating(set, 1000)).toMatchObject({ timestamp: 1000, face: { v: 0.5, a: -0.5 }, labels: [{ name: 'calm', level: 1 }] });
    const unset = play([{ type: 'showWords' }, { type: 'tap', name: 'calm' }]);
    expect(raterRating(unset).face).toBeNull();
  });

  it('resets', () => {
    expect(play([{ type: 'move', v: 1, a: 1 }, { type: 'settle' }, { type: 'reset' }])).toEqual(createRater());
  });
});

describe('RATER_TIMING', () => {
  it('holds the agreed numbers', () => {
    expect(RATER_TIMING.dwellMs).toBe(500);
    expect(RATER_TIMING.reorder).toEqual({ ms: 320, bezier: [0.44, 0, 0.36, 1] });
    expect(RATER_TIMING.reduced.reorder.ms).toBe(200);
    expect(RATER_TIMING.reduced.chipRings.ms).toBe(0);
    expect(RATER_TIMING.inkIn.ms).toBe(150);
  });
});
