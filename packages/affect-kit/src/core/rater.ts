// Pure module: the rater's behavior as a reducer, plus its timing and layout.
// `<affect-kit-rater>` runs on this, and a native rater can too, so both
// behave the same by construction. No DOM, no Lit, no timers: the renderer
// owns pointers and the dwell timer, and sends events.
//
// Bridge for Angular readers: this is an NgRx-style reducer. State is plain
// data, events are actions, and `raterReducer(state, event)` returns the next
// state without changing the old one.

import { EMOTIONS, EMOTIONS_BY_NAME, type EmotionName } from '../vocabulary/en';
import { wordOrder } from '../vocabulary/order';
import { nudgeFace, type FaceAxis } from './a11y';
import { FACE_MOTION } from './motion';
import { createRating } from './vad';
import type { Rating } from './types';

/** The rater's rules. */
export const RATER_RULES = {
  /** Words at most. A tap that would add another is refused; raising a chosen word never is. */
  maxWords: 5,
  /** Levels per word: taps cycle 0 → 1 → 2 → 3 → 0. */
  levels: 3,
} as const;

/** A transition: milliseconds and a cubic-bezier. CSS and Reanimated both take these numbers. */
export interface Curve {
  ms: number;
  bezier: readonly [number, number, number, number];
}

const EASE = [0.25, 0.1, 0.25, 1] as const;   // CSS `ease`

/** Every transition in the rater, so a native rater moves as the web one does. */
export const RATER_TIMING = {
  /** A finger this long still on the pad counts as a choice: the words re-sort. */
  dwellMs: 500,
  /** The words appear after the face first settles: they rise 8 px and unblur from 4 px… */
  reveal: { ms: 700, bezier: [0.16, 1, 0.3, 1] },
  /** …while fading in. */
  revealFade: { ms: 650, bezier: EASE },
  /** The words slide to a new order together, with no stagger. The first sort is silent. */
  reorder: { ms: 320, bezier: [0.44, 0, 0.36, 1] },
  /** The unset face inks in on the first move. */
  inkIn: { ms: 150, bezier: EASE },
  /** A chip's fill and text. */
  chipColor: { ms: 220, bezier: EASE },
  /** A chip's rings growing. */
  chipRings: { ms: 180, bezier: EASE },
  /** The hint and Done cross-fade, and hide while dragging. */
  header: { ms: 250, bezier: EASE },
  /** The halo behind the face. */
  halo: { ms: 500, bezier: EASE },
  /** The dot under the finger. */
  dot: { ms: 300, bezier: EASE },
  /** With Reduce Motion: fades stay, travel and growth go. */
  reduced: {
    /** The words fade in, without rising or unblurring: the same as the reorder crossfade. */
    reveal: { ms: 200, bezier: EASE },
    /** The re-sort is an opacity crossfade, with no travel. */
    reorder: { ms: 200, bezier: EASE },
    /** The rings appear without growing. */
    chipRings: { ms: 0, bezier: EASE },
  },
} as const;

/** The rater's proportions, in px unless noted. */
export const RATER_LAYOUT = {
  /** The pad's width at most, and in the wide layout. */
  faceMax: 200,
  faceMaxWide: 280,
  /** The rater switches to the wide layout (face left, words right) from this width. */
  wideAt: 860,
  /** The face's share of the pad. */
  faceInset: 0.94,
  /** The dot under the finger. */
  dotSize: 9,
  /** The face's shadow: y offset, blur and opacity of black. */
  faceShadow: { y: 10, blur: 28, opacity: 0.14 },
  /** How far the words rise as they appear, and the blur they start from. */
  revealRise: 8,
  revealBlur: 4,
} as const;

/** Before the first touch the face sits at the centre in faded ink, with no breath, glow or color. */
export const UNSET_FACE = { v: 0, a: 0, inkOpacity: 0.4 } as const;

/** The rater as plain data. */
export interface RaterState {
  /** Where the face is. `null` until set by a drag or a screen-reader step. */
  face: { v: number; a: number } | null;
  /** A finger is on the pad. */
  dragging: boolean;
  /** The words show: from the face's first settle, or after `showWords`. */
  revealed: boolean;
  /** The word order: vocabulary order until the face settles. */
  order: readonly EmotionName[];
  /** The chosen words, in the order first chosen. A word cycled off and chosen again goes last. */
  chosen: ReadonlyArray<{ name: EmotionName; level: 1 | 2 | 3 }>;
}

/** What can happen to the rater. */
export type RaterEvent =
  /** A finger moving on the pad: the face follows, the words stay put. */
  | { type: 'move'; v: number; a: number }
  /** The finger lifted, or held still for `RATER_TIMING.dwellMs`: the words show and re-sort. */
  | { type: 'settle' }
  /** A screen-reader step on one axis: the face moves one stop and the words re-sort. */
  | { type: 'adjust'; axis: FaceAxis; direction: 1 | -1 }
  /** Words without the face, in vocabulary order. The face stays unset. */
  | { type: 'showWords' }
  /** A tap on a word: 0 → 1 → 2 → 3 → 0. */
  | { type: 'tap'; name: EmotionName }
  /** Open a saved rating to change it. */
  | { type: 'load'; rating: Rating }
  | { type: 'reset' };

const VOCABULARY_ORDER: readonly EmotionName[] = EMOTIONS.map(e => e.name);

/** A rater with nothing set. */
export function createRater(): RaterState {
  return { face: null, dragging: false, revealed: false, order: VOCABULARY_ORDER, chosen: [] };
}

function levelOf(state: RaterState, name: EmotionName): 0 | 1 | 2 | 3 {
  return state.chosen.find(c => c.name === name)?.level ?? 0;
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** The next state. The old one is never changed. */
export function raterReducer(state: RaterState, event: RaterEvent): RaterState {
  switch (event.type) {
    case 'move':
      return { ...state, face: { v: clamp(event.v), a: clamp(event.a) }, dragging: true };

    case 'settle':
      if (!state.face) return state.dragging ? { ...state, dragging: false } : state;
      return { ...state, dragging: false, revealed: true, order: wordOrder(state.face.v, state.face.a) };

    case 'adjust': {
      const face = nudgeFace(state.face, event.axis, event.direction);
      return { ...state, face, revealed: true, order: wordOrder(face.v, face.a) };
    }

    case 'showWords':
      return state.revealed ? state : { ...state, revealed: true };

    case 'tap': {
      const level = levelOf(state, event.name);
      if (level === 0) {
        if (state.chosen.length >= RATER_RULES.maxWords) return state;
        return { ...state, chosen: [...state.chosen, { name: event.name, level: 1 }] };
      }
      if (level === RATER_RULES.levels) {
        return { ...state, chosen: state.chosen.filter(c => c.name !== event.name) };
      }
      const next = (level + 1) as 2 | 3;
      return { ...state, chosen: state.chosen.map(c => (c.name === event.name ? { name: c.name, level: next } : c)) };
    }

    case 'load': {
      const { face, labels } = event.rating;
      // Saved levels can be averages; a chip shows whole levels.
      const chosen = labels.slice(0, RATER_RULES.maxWords).map(l => ({
        name: l.name,
        level: Math.max(1, Math.min(3, Math.round(l.level))) as 1 | 2 | 3,
      }));
      return {
        face: face ? { v: clamp(face.v), a: clamp(face.a) } : null,
        dragging: false,
        revealed: true,
        order: face ? wordOrder(face.v, face.a) : VOCABULARY_ORDER,
        chosen,
      };
    }

    case 'reset':
      return createRater();
  }
}

/** Done waits for at least one word. */
export function canFinish(state: RaterState): boolean {
  return state.chosen.length > 0;
}

/** The rating to save. Its face is `null` when it was never set, never the centre. */
export function raterRating(state: RaterState, timestamp?: number): Rating {
  const labels = [...state.chosen];
  return timestamp === undefined
    ? createRating({ face: state.face, labels })
    : createRating({ face: state.face, labels, timestamp });
}

/** True when the step from `prev` to `next` raised a high-energy word: shock the face (`kickShock`). */
export function tapShocks(prev: RaterState, next: RaterState): boolean {
  for (const c of next.chosen) {
    if (c.level > levelOf(prev, c.name) && (EMOTIONS_BY_NAME.get(c.name)?.a ?? 0) > FACE_MOTION.highEnergy) return true;
  }
  return false;
}
