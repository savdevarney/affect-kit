// Pure module: per-frame animation offsets (breath, tremor, shock energy).
// Composed on top of FaceParams by the face and rater components.
// No DOM, no Lit, no state — callers own t, motionScale, shockEnergy.

/** @internal */
export interface AnimationOffsets {
  /** Group-level translation: breath + main tremor. */
  groupX: number;
  groupY: number;
  /** Per-feature individual chaos offsets. Zero when inactive. */
  perFeature: {
    leftBrow:  { dx: number; dy: number }; // data-feature="brow-l", seed 1
    rightBrow: { dx: number; dy: number }; // data-feature="brow-r", seed 2
    leftEye:   { dx: number; dy: number }; // data-feature="eye-l",  seed 3
    rightEye:  { dx: number; dy: number }; // data-feature="eye-r",  seed 4
    nose:      { dx: number; dy: number }; // data-feature="nose",   seed 5
    mouth:     { dx: number; dy: number }; // data-feature="mouth",  seed 6
  };
  /** Multiplier on crows-feet group opacity (0..1, additional to base). */
  crowsFeetOpacityScale: number;
}

const ZERO_FEATURE = { dx: 0, dy: 0 } as const;

const ZERO_OFFSETS: AnimationOffsets = {
  groupX: 0,
  groupY: 0,
  perFeature: {
    leftBrow:  ZERO_FEATURE,
    rightBrow: ZERO_FEATURE,
    leftEye:   ZERO_FEATURE,
    rightEye:  ZERO_FEATURE,
    nose:      ZERO_FEATURE,
    mouth:     ZERO_FEATURE,
  },
  crowsFeetOpacityScale: 1,
};

/**
 * @internal
 * Compute per-frame animation offsets given current time, V/A, and modulators.
 *
 * `reducedMotion=true` returns all-zero offsets immediately — the caller can
 * then skip its RAF loop entirely if desired.
 *
 * Animation model:
 * - Breath: sinusoidal at 0.55 Hz, amplitude 0.45 * motionScale.
 *   Always present when not in reduced-motion mode.
 * - Tremor: high-arousal group motion. Blends cohesion (positive V, joyful
 *   bouncy) and chaos (negative V, anger shake) continuously across the V/A space.
 * - Individual per-feature chaos: at strong negative V + positive A, each
 *   facial feature gets independent jitter on top of the group motion.
 * - Shock energy: brief high-frequency burst when a high-arousal label is
 *   toggled. Decays *= 0.93 per frame outside this function — caller must
 *   apply the decay step each frame.
 */
export function computeAnimationOffsets(args: {
  t: number;
  v: number;
  a: number;
  motionScale: number;
  shockEnergy: number;
  reducedMotion: boolean;
}): AnimationOffsets {
  if (args.reducedMotion) return ZERO_OFFSETS;

  const { t, v, a, motionScale, shockEnergy } = args;

  const breath    = Math.sin(t * 0.55) * 0.45 * motionScale;
  const intensity = Math.max(0, a + 0.25) * 0.95;

  let dx: number;
  let dy: number;

  if (intensity < 0.02) {
    dx = 0;
    dy = breath;
  } else {
    const chaos     = Math.max(0, -v) * intensity;
    const cohesion  = Math.max(0,  v) * intensity;
    const groupFreq = 1.6 + chaos * 2.5 - cohesion * 0.6;
    const groupAmp  = intensity * 2.8 * motionScale;
    const blend     = Math.max(0, Math.min(1, 0.5 + v * 0.5)); // 0=chaos, 1=cohesion

    const cohX = Math.sin(t * groupFreq) * groupAmp;
    const cohY = Math.sin(t * groupFreq * 1.3) * groupAmp;
    const chX  = (Math.sin(t * groupFreq * 1.41) + Math.sin(t * groupFreq * 1.73)) * 0.5 * groupAmp;
    const chY  = (Math.sin(t * groupFreq * 1.27) + Math.sin(t * groupFreq * 1.91)) * 0.5 * groupAmp;

    dx = cohX * blend + chX * (1 - blend);
    dy = cohY * blend + chY * (1 - blend) + breath;
  }

  if (shockEnergy > 0.05) {
    const shockFreq = 24;
    const shockAmp  = shockEnergy * 3.5 * motionScale;
    dx += (Math.sin(t * shockFreq) + Math.sin(t * shockFreq * 1.83)) * 0.5 * shockAmp;
    dy += (Math.cos(t * shockFreq * 1.13) + Math.sin(t * shockFreq * 1.51)) * 0.5 * shockAmp;
  }

  // Per-feature individual chaos — only active at strong anger (negative V, positive A)
  const indChaos = Math.max(0, -v) * Math.max(0, a + 0.1);
  const perFeature = buildPerFeatureOffsets(t, indChaos, motionScale);

  return { groupX: dx, groupY: dy, perFeature, crowsFeetOpacityScale: 1 };
}

function buildPerFeatureOffsets(
  t: number,
  indChaos: number,
  motionScale: number,
): AnimationOffsets['perFeature'] {
  if (indChaos < 0.08 || motionScale < 0.4) {
    return ZERO_OFFSETS.perFeature;
  }
  const indFreq = 9 + indChaos * 5;
  const indAmp  = indChaos * 0.7 * motionScale;
  const feature = (seed: number) => ({
    dx: Math.sin(t * indFreq + seed * 1.7) * indAmp,
    dy: Math.cos(t * indFreq + seed * 2.3) * indAmp,
  });
  return {
    leftBrow:  feature(1),
    rightBrow: feature(2),
    leftEye:   feature(3),
    rightEye:  feature(4),
    nose:      feature(5),
    mouth:     feature(6),
  };
}
