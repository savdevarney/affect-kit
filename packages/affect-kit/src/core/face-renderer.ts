// Pure module: V/A → face SVG path strings. No DOM, no Lit, no state.
// Face anatomy based on FACS (Ekman & Friesen 1978). Cross-cultural
// validation: Cordaro et al. 2018 (17 cultures).

/** @internal */
export interface FaceParams {
  browInnerY: number;
  browOuterY: number;
  eyeWidth: number;
  thicknessTop: number;
  thicknessBottom: number;
  topAsymmetry: number;
  crowsFeetOp: number;
  mouthCornerY: number;
  mouthMidY: number;
  mouthWidth: number;
  mouthOpen: number;
}

/** @internal Path strings only — caller owns the <svg>/<g> shells. */
export interface FacePaths {
  leftBrow: string;
  rightBrow: string;
  leftEye: string;
  rightEye: string;
  crowsFeetLeft: string;   // rendered as a group; caller controls opacity
  crowsFeetRight: string;
  nose: string;
  mouth: string;
}

export const FACE_VIEWBOX = '-85 -85 170 170';

/** @internal Ink color: overridable via --affect-kit-ink CSS custom property. */
export const STROKE_COLOR = 'var(--affect-kit-ink, #1a1a1a)';

/** @internal */
export const STROKE_WIDTH = 4.5;

// ─── Face parameter computation ────────────────────────────────────────────

/**
 * @internal
 * Map V/A ∈ [-1, 1] to static face parameters by blending four quadrant
 * expressions: anger (V<0, A>0), joy (V>0, A>0), calm (V>0, A<0),
 * sad (V<0, A<0). Quadrant weights are the product of clipped V and A
 * components — smooth, continuous blending through all positions.
 */
export function computeTarget(v: number, a: number): FaceParams {
  const angerW = Math.max(0, -v) * Math.max(0,  a);
  const joyW   = Math.max(0,  v) * Math.max(0,  a);
  const calmW  = Math.max(0,  v) * Math.max(0, -a);
  const sadW   = Math.max(0, -v) * Math.max(0, -a);
  const aPos   = Math.max(0, a);  // positive arousal component only

  // ── Brows ──
  // baseline: -32 (slightly above eye center at y=-12)
  let browInnerY = -32;
  let browOuterY = -32;
  browInnerY += angerW * 9;   // anger: inner brow lowered (furrowed)
  browOuterY += angerW * 1;
  browInnerY -= sadW   * 9;   // sad:   inner brow raised (AU 1+2)
  browOuterY += sadW   * 5;
  browInnerY -= joyW   * 3;   // joy:   slight Duchenne raise
  browOuterY -= joyW   * 7;
  browOuterY -= aPos   * 1.5; // arousal generally raises brows

  // ── Eyes ──
  let eyeWidth        = 4 + aPos * 4;
  let thicknessTop    = 3 + aPos * 6;
  let thicknessBottom = 3 + aPos * 3;
  let topAsymmetry    = 0;

  thicknessTop    += joyW * 1;    // joy: Duchenne arch
  thicknessBottom -= joyW * 6;
  eyeWidth        += joyW * 2;

  eyeWidth        -= sadW * 1.5;  // sad: drooping, narrowed
  thicknessTop    -= sadW * 1;
  thicknessBottom += sadW * 2;

  eyeWidth        -= angerW * 1.5; // anger: narrowed (AU 4)
  thicknessTop    -= angerW * 1.5;
  topAsymmetry     = angerW * 0.55; // anger: asymmetric top lid

  thicknessTop    += calmW * 3;   // calm: soft arch
  thicknessBottom -= calmW * 5;
  eyeWidth        += calmW * 2;

  // Crows feet only appear in genuine Duchenne smiles (high positive joy).
  const crowsFeetOp = Math.min(0.7, joyW * 1.3);

  // ── Mouth ──
  let mouthCornerY = 32 - v * 9;     // positive V → corners up
  let mouthMidY    = 32 + v * 20;    // positive V → mid point up (wider smile arc)
  let mouthWidth   = 22 + aPos * 3;
  let mouthOpen    = aPos * 6;       // arousal → mouth open

  mouthWidth -= angerW * 4;          // anger: tight/narrow
  mouthWidth += joyW   * 2;          // joy: wide
  mouthOpen  *= (1 - sadW * 0.6);   // sadness dampens mouth opening

  return {
    browInnerY, browOuterY,
    eyeWidth, thicknessTop, thicknessBottom, topAsymmetry,
    crowsFeetOp,
    mouthCornerY, mouthMidY, mouthWidth, mouthOpen,
  };
}

// ─── SVG path builders ─────────────────────────────────────────────────────

/**
 * @internal
 * Single-eye cubic bezier path. Top curve is asymmetric for the anger frown.
 * cy=-12 is the vertical center of both eyes.
 */
export function eyePath(args: {
  cx: number;
  width: number;
  topYOuter: number;
  topYInner: number;
  bottomY: number;
  isLeft: boolean;
}): string {
  const { cx, width, topYOuter, topYInner, bottomY, isLeft } = args;
  const cy = -12;
  const outerX = cx + (isLeft ? -width : width);
  const innerX = cx + (isLeft ? width : -width);
  const ctrlOuterX = outerX + (innerX - outerX) * 0.33;
  const ctrlInnerX = outerX + (innerX - outerX) * 0.67;
  return (
    `M ${outerX.toFixed(2)} ${cy} ` +
    `C ${ctrlOuterX.toFixed(2)} ${topYOuter.toFixed(2)} ` +
      `${ctrlInnerX.toFixed(2)} ${topYInner.toFixed(2)} ` +
      `${innerX.toFixed(2)} ${cy} ` +
    `Q ${cx.toFixed(2)} ${bottomY.toFixed(2)} ${outerX.toFixed(2)} ${cy} Z`
  );
}

/**
 * @internal
 * Build all SVG `d` strings for a face given its FaceParams.
 * Returns a plain object of strings — no DOM, no innerHTML.
 * The caller (Lit component) owns the surrounding <svg> and <g> shells.
 */
export function renderFace(p: FaceParams): FacePaths {
  // Brows: quadratic bezier from outer corner to inner tip
  const leftBrow  = `M -42 ${p.browOuterY} Q -27 ${(p.browOuterY + p.browInnerY) / 2 - 2} -12 ${p.browInnerY}`;
  const rightBrow = `M 12 ${p.browInnerY} Q 27 ${(p.browOuterY + p.browInnerY) / 2 - 2} 42 ${p.browOuterY}`;

  // Eyes: parameterized cubic bezier + quadratic underbelly
  const cy       = -12;
  const topYOuter = cy - p.thicknessTop;
  const topYInner = cy - p.thicknessTop * (1 - p.topAsymmetry);
  const bottomY   = cy + p.thicknessBottom;
  const leftEye  = eyePath({ cx: -28, width: p.eyeWidth, topYOuter, topYInner, bottomY, isLeft: true });
  const rightEye = eyePath({ cx:  28, width: p.eyeWidth, topYOuter, topYInner, bottomY, isLeft: false });

  // Crows feet: two lines per side (caller renders inside <g opacity={crowsFeetOp}>)
  const crowsFeetLeft  = 'M -41 -10 L -47 -14 M -41 -7 L -48 -8';
  const crowsFeetRight = 'M 41 -10 L 47 -14 M 41 -7 L 48 -8';

  // Nose
  const nose = 'M -3 5 Q 0 9 3 5';

  // Mouth: closed = rounded bezier arc; open = hollow shape with upper + lower arc
  const upperY  = p.mouthMidY - p.mouthOpen * 0.35;
  const lowerY  = p.mouthMidY + p.mouthOpen * 0.65;
  const mouth   = `M ${-p.mouthWidth} ${p.mouthCornerY} Q 0 ${upperY} ${p.mouthWidth} ${p.mouthCornerY} Q 0 ${lowerY} ${-p.mouthWidth} ${p.mouthCornerY} Z`;

  return { leftBrow, rightBrow, leftEye, rightEye, crowsFeetLeft, crowsFeetRight, nose, mouth };
}

// ─── Smoothing ─────────────────────────────────────────────────────────────

/**
 * @internal
 * Single exponential-smoothing step: current → target by factor k.
 * k=0.11 matches the prototype — settles to target in ~100ms at 60fps.
 * Returns a new FaceParams; caller owns the mutable state.
 */
export function smoothFaceParams(current: FaceParams, target: FaceParams, k: number): FaceParams {
  const s = (c: number, t: number) => c + (t - c) * k;
  return {
    browInnerY:     s(current.browInnerY,     target.browInnerY),
    browOuterY:     s(current.browOuterY,     target.browOuterY),
    eyeWidth:       s(current.eyeWidth,       target.eyeWidth),
    thicknessTop:   s(current.thicknessTop,   target.thicknessTop),
    thicknessBottom:s(current.thicknessBottom,target.thicknessBottom),
    topAsymmetry:   s(current.topAsymmetry,   target.topAsymmetry),
    crowsFeetOp:    s(current.crowsFeetOp,     target.crowsFeetOp),
    mouthCornerY:   s(current.mouthCornerY,   target.mouthCornerY),
    mouthMidY:      s(current.mouthMidY,      target.mouthMidY),
    mouthWidth:     s(current.mouthWidth,     target.mouthWidth),
    mouthOpen:      s(current.mouthOpen,      target.mouthOpen),
  };
}
