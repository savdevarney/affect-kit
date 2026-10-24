// Pure module: the face in motion, by time. Easing toward a target, the shock
// burst when a high-energy word is chosen, and the breath, tremor and jitter
// that make the face live. No DOM, no Lit, no state: the caller owns the clock
// and the current numbers. Worklet-ready, like face-renderer.ts.
//
// Every rate is per elapsed time, not per frame, so a 120 Hz screen moves the
// face exactly as a 60 Hz one does.

import type { FaceParams } from './face-renderer';

/** The motion's constants. */
export const FACE_MOTION = {
  /** Share of the remaining distance the face covers per 1/60 s: about 430 ms to 95%. */
  smoothing: 0.11,
  /** With Reduce Motion the face still eases, faster: about 120 ms to 95%. */
  reducedSmoothing: 0.34,
  /** Added to the shock (at most 1) when a high-energy word goes up a level. */
  shockKick: 0.6,
  /** Share of the shock kept per 1/60 s. */
  shockDecay: 0.93,
  /** Motion while a finger is on the pad, so the face stays readable. */
  dragScale: 0.2,
  /** A word above this arousal shocks the face when it goes up a level. */
  highEnergy: 0.3,
  /**
   * The idle breath: 12 a minute, an ordinary resting rate. It stays out of
   * the 4 to 8 a minute range that breathing pacers use, and never follows
   * arousal, so a calm face never drifts into it.
   */
  breathsPerMinute: 12,
  /** The breath's height, in face units. */
  breathAmplitude: 0.45,
  /**
   * Nothing on the face sways slower than this, in cycles a minute: the
   * tremor's slowest, at strong pleasant energy, was about 8.5, close enough
   * to slow paced breathing to count. Same rule as the breath.
   */
  slowestSwayPerMinute: 12,
} as const;

const FRAME_MS = 1000 / 60;
const BREATH_RAD_PER_S = (2 * Math.PI * FACE_MOTION.breathsPerMinute) / 60;
const SLOWEST_SWAY_RAD_PER_S = (2 * Math.PI * FACE_MOTION.slowestSwayPerMinute) / 60;

// A per-frame share, scaled to the time that actually passed.
function perElapsed(perFrame: number, dtMs: number): number {
  'worklet';
  return Math.pow(perFrame, Math.max(0, dtMs) / FRAME_MS);
}

/**
 * Ease the face's numbers toward a target over `dtMs`. Reduce Motion eases
 * faster; it never snaps, because the face moves under the finger and
 * carries the meaning.
 *
 * ```ts
 * current = smoothFaceParams(current, faceParams(v, a), dtMs);
 * ```
 */
export function smoothFaceParams(
  current: FaceParams, target: FaceParams, dtMs: number, opts?: { reducedMotion?: boolean },
): FaceParams {
  'worklet';
  if (dtMs <= 0) return current;
  const k = opts?.reducedMotion ? FACE_MOTION.reducedSmoothing : FACE_MOTION.smoothing;
  const keep = perElapsed(1 - k, dtMs);
  const s = (c: number, t: number) => t + (c - t) * keep;
  return {
    browInnerY:      s(current.browInnerY,      target.browInnerY),
    browOuterY:      s(current.browOuterY,      target.browOuterY),
    eyeWidth:        s(current.eyeWidth,        target.eyeWidth),
    thicknessTop:    s(current.thicknessTop,    target.thicknessTop),
    thicknessBottom: s(current.thicknessBottom, target.thicknessBottom),
    topAsymmetry:    s(current.topAsymmetry,    target.topAsymmetry),
    crowsFeetOp:     s(current.crowsFeetOp,     target.crowsFeetOp),
    mouthCornerY:    s(current.mouthCornerY,    target.mouthCornerY),
    mouthMidY:       s(current.mouthMidY,       target.mouthMidY),
    mouthWidth:      s(current.mouthWidth,      target.mouthWidth),
    mouthOpen:       s(current.mouthOpen,       target.mouthOpen),
  };
}

/** True when the face is close enough to its target to stop animating. */
export function faceSettled(current: FaceParams, target: FaceParams): boolean {
  'worklet';
  return Math.abs(current.browInnerY - target.browInnerY) < 0.01
    && Math.abs(current.browOuterY - target.browOuterY) < 0.01
    && Math.abs(current.eyeWidth - target.eyeWidth) < 0.01
    && Math.abs(current.thicknessTop - target.thicknessTop) < 0.01
    && Math.abs(current.thicknessBottom - target.thicknessBottom) < 0.01
    && Math.abs(current.topAsymmetry - target.topAsymmetry) < 0.001
    && Math.abs(current.crowsFeetOp - target.crowsFeetOp) < 0.001
    && Math.abs(current.mouthCornerY - target.mouthCornerY) < 0.01
    && Math.abs(current.mouthMidY - target.mouthMidY) < 0.01
    && Math.abs(current.mouthWidth - target.mouthWidth) < 0.01
    && Math.abs(current.mouthOpen - target.mouthOpen) < 0.01;
}

/** A high-energy word went up a level: the shock jumps, to at most 1. */
export function kickShock(shock: number): number {
  'worklet';
  return Math.min(1, shock + FACE_MOTION.shockKick);
}

/** The shock fading over `dtMs`. */
export function decayShock(shock: number, dtMs: number): number {
  'worklet';
  return shock * perElapsed(FACE_MOTION.shockDecay, dtMs);
}

/** How far the face and its parts move this moment, in face units. */
export interface FaceOffsets {
  /** The whole face: breath, tremor and shock. */
  x: number;
  y: number;
  /** Each part's own jitter, at strong unpleasant energy (anger). Zero otherwise. */
  parts: Record<'leftBrow' | 'rightBrow' | 'leftEye' | 'rightEye' | 'nose' | 'mouth', { x: number; y: number }>;
}

const STILL = { x: 0, y: 0 };
const STILL_PARTS: FaceOffsets['parts'] = {
  leftBrow: STILL, rightBrow: STILL, leftEye: STILL, rightEye: STILL, nose: STILL, mouth: STILL,
};

function partJitter(t: number, chaos: number, motionScale: number): FaceOffsets['parts'] {
  'worklet';
  if (chaos < 0.08 || motionScale < 0.4) return STILL_PARTS;
  const freq = 9 + chaos * 5;
  const amp = chaos * 0.7 * motionScale;
  const at = (seed: number) => ({
    x: Math.sin(t * freq + seed * 1.7) * amp,
    y: Math.cos(t * freq + seed * 2.3) * amp,
  });
  return { leftBrow: at(1), rightBrow: at(2), leftEye: at(3), rightEye: at(4), nose: at(5), mouth: at(6) };
}

/**
 * The offsets that make the face live at time `t` (seconds), for a face at
 * (v, a):
 * - **Breath:** 12 a minute, always on.
 * - **Tremor:** grows with arousal, bouncy when pleasant, shaky when unpleasant.
 * - **Jitter:** each part on its own, at strong unpleasant energy.
 * - **Shock:** a quick burst while `shock` (see {@link kickShock}) fades.
 *
 * `motionScale` is `FACE_MOTION.dragScale` while a finger is down, 1 otherwise.
 * Under Reduce Motion everything is zero: the face holds still.
 */
export function faceMotion(
  t: number, v: number, a: number,
  opts: { motionScale: number; shock: number; reducedMotion: boolean },
): FaceOffsets {
  'worklet';
  if (opts.reducedMotion) return { x: 0, y: 0, parts: STILL_PARTS };
  const { motionScale, shock } = opts;

  const breath = Math.sin(t * BREATH_RAD_PER_S) * FACE_MOTION.breathAmplitude * motionScale;
  const intensity = Math.max(0, a + 0.25) * 0.95;

  let x: number;
  let y: number;
  if (intensity < 0.02) {
    x = 0;
    y = breath;
  } else {
    const chaos     = Math.max(0, -v) * intensity;
    const cohesion  = Math.max(0,  v) * intensity;
    // Floored, so the slowest sway (the joyful bounce) stays out of pacing rates.
    const groupFreq = Math.max(SLOWEST_SWAY_RAD_PER_S, 1.6 + chaos * 2.5 - cohesion * 0.6);
    const groupAmp  = intensity * 2.8 * motionScale;
    const blend     = Math.max(0, Math.min(1, 0.5 + v * 0.5)); // 0 = chaos, 1 = cohesion

    const cohX = Math.sin(t * groupFreq) * groupAmp;
    const cohY = Math.sin(t * groupFreq * 1.3) * groupAmp;
    const chX  = (Math.sin(t * groupFreq * 1.41) + Math.sin(t * groupFreq * 1.73)) * 0.5 * groupAmp;
    const chY  = (Math.sin(t * groupFreq * 1.27) + Math.sin(t * groupFreq * 1.91)) * 0.5 * groupAmp;

    x = cohX * blend + chX * (1 - blend);
    y = cohY * blend + chY * (1 - blend) + breath;
  }

  if (shock > 0.05) {
    const shockFreq = 24;
    const shockAmp  = shock * 3.5 * motionScale;
    x += (Math.sin(t * shockFreq) + Math.sin(t * shockFreq * 1.83)) * 0.5 * shockAmp;
    y += (Math.cos(t * shockFreq * 1.13) + Math.sin(t * shockFreq * 1.51)) * 0.5 * shockAmp;
  }

  const chaos = Math.max(0, -v) * Math.max(0, a + 0.1);
  return { x, y, parts: partJitter(t, chaos, motionScale) };
}
