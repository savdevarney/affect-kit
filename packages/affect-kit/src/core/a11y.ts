// Pure module: what a screen reader hears, and the face as two adjustable
// values for VoiceOver, TalkBack and the keyboard. Every string comes from a
// table, English by default, so an app passes its own words. No DOM, no Lit.

/** Everything a screen reader hears. Pass your own to change the words or the language. */
export interface A11yStrings {
  /** The first adjustable value's name. */
  pleasant: string;
  /** The second adjustable value's name. */
  energized: string;
  /** Bands from low to high, any count, equally wide across -1 to 1. A value takes the band it falls in. */
  pleasantBands: readonly string[];
  energizedBands: readonly string[];
  /** A chosen word's level, 1 to 3. */
  levels: readonly [string, string, string];
  /** Between the parts of a description: "pleasant, calm". */
  joiner: string;
  /** An axis's value before the face is set. */
  notSet: string;
  /** The face before it's set, read as a whole. */
  faceNotSet: string;
  /** A control that goes straight to the words, leaving the face unset. Falls back to English. */
  showWords?: string;
}

/** English. With five bands, the nine steps read: very, very, plain, plain, neither, plain, plain, very, very. */
export const A11Y_STRINGS_EN: A11yStrings = {
  pleasant: 'How pleasant',
  energized: 'How energized',
  pleasantBands: ['very unpleasant', 'unpleasant', 'neither', 'pleasant', 'very pleasant'],
  energizedBands: ['very calm', 'calm', 'neither', 'energized', 'very energized'],
  levels: ['a little', 'clearly', 'strongly'],
  joiner: ', ',
  notSet: 'not set',
  faceNotSet: 'Face, not set',
  showWords: 'Choose words without the face',
};

/** The axes a screen reader adjusts. */
export type FaceAxis = 'pleasant' | 'energized';

/** The stops each axis moves through: -1 to 1 in steps of 0.25, nine per axis. */
export const FACE_STEPS: readonly number[] = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

function band(value: number, bands: readonly string[]): string {
  const index = Math.floor(((Math.max(-1, Math.min(1, value)) + 1) / 2) * bands.length);
  return bands[Math.min(bands.length - 1, index)]!;
}

/** A face position for a screen reader: "pleasant, calm". */
export function describeFace(v: number, a: number, strings: A11yStrings = A11Y_STRINGS_EN): string {
  return band(v, strings.pleasantBands) + strings.joiner + band(a, strings.energizedBands);
}

/** One axis's spoken value: its band, or `strings.notSet` while the face is unset (`null`). */
export function axisValueText(
  axis: FaceAxis, face: { v: number; a: number } | null, strings: A11yStrings = A11Y_STRINGS_EN,
): string {
  if (face === null) return strings.notSet;
  return axis === 'pleasant' ? band(face.v, strings.pleasantBands) : band(face.a, strings.energizedBands);
}

// A dragged face sits between stops; a hair either side of a stop counts as on it.
const ON_STOP = 1e-9;

/**
 * One adjustment on one axis: the value moves to the next stop up or down
 * (from a dragged face, the nearest stop past it), and the other axis stays
 * put. At either end it stays. An unset face (`null`) starts from the centre,
 * so its first step up on "How pleasant" lands at 0.25.
 */
export function nudgeFace(
  face: { v: number; a: number } | null, axis: FaceAxis, direction: 1 | -1,
): { v: number; a: number } {
  const from = face ?? { v: 0, a: 0 };
  const current = axis === 'pleasant' ? from.v : from.a;
  let next = direction > 0 ? FACE_STEPS[FACE_STEPS.length - 1]! : FACE_STEPS[0]!;
  for (const step of FACE_STEPS) {
    if (direction > 0 && step > current + ON_STOP && step < next) next = step;
    if (direction < 0 && step < current - ON_STOP && step > next) next = step;
  }
  if (direction > 0 && current >= next) next = Math.min(1, current);
  if (direction < 0 && current <= next) next = Math.max(-1, current);
  return axis === 'pleasant' ? { v: next, a: from.a } : { v: from.v, a: next };
}

/** A word chip's accessible name: "anxious, strongly", or just the word when it isn't chosen. */
export function chipLabel(name: string, level: number, strings: A11yStrings = A11Y_STRINGS_EN): string {
  const lv = Math.max(0, Math.min(3, Math.round(level)));
  return lv === 0 ? name : name + strings.joiner + strings.levels[lv - 1]!;
}

/**
 * A word chip for a screen reader: its name, and whether it's chosen. A chip
 * is a toggle, so an unchosen one reads as off, not as a plain label.
 *
 * ```ts
 * chipA11y('anxious', 2); // { label: 'anxious, clearly', selected: true }
 * ```
 */
export function chipA11y(
  name: string, level: number, strings: A11yStrings = A11Y_STRINGS_EN,
): { label: string; selected: boolean } {
  return { label: chipLabel(name, level, strings), selected: Math.round(level) > 0 };
}
