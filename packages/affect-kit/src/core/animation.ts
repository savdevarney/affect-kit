// Pure module: per-frame animation modulators (breath, tremor, shock energy).
// Composed on top of FaceParams by the rater + face components.
// Implementation comes in a follow-up commit.

/** @internal */
export interface AnimationOffsets {
  groupX: number;
  groupY: number;
  perFeature: {
    leftBrow: { dx: number; dy: number };
    rightBrow: { dx: number; dy: number };
    leftEye: { dx: number; dy: number };
    rightEye: { dx: number; dy: number };
    mouth: { dx: number; dy: number };
  };
  crowsFeetOpacityScale: number;
}

/**
 * @internal
 * Compute per-frame offsets given current time, V/A, and modulators.
 * Returns all-zero offsets when reducedMotion is true; callers can then
 * skip their RAF loop entirely.
 */
export function computeAnimationOffsets(_args: {
  t: number;
  v: number;
  a: number;
  motionScale: number;
  shockEnergy: number;
  reducedMotion: boolean;
}): AnimationOffsets {
  throw new Error('computeAnimationOffsets: not implemented');
}
