// Pure module: V/A → face SVG path strings. No DOM, no Lit, no state.
// Implementation comes in a follow-up commit; the API shape is locked here.

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
  crowsFeet: string;
  nose: string;
  mouth: string;
}

export const FACE_VIEWBOX = '-85 -85 170 170';

/** @internal */
export const STROKE_COLOR = 'var(--affect-kit-ink, #1a1a1a)';

/** @internal */
export const STROKE_WIDTH = 4.5;

/** @internal V/A ∈ [-1, 1] → static face parameters. */
export function computeTarget(_v: number, _a: number): FaceParams {
  throw new Error('computeTarget: not implemented');
}

/** @internal Build SVG path strings for every feature of a face. */
export function renderFace(_params: FaceParams): FacePaths {
  throw new Error('renderFace: not implemented');
}

/** @internal Single-eye path; exposed for tests. */
export function eyePath(_args: {
  cx: number;
  width: number;
  topYOuter: number;
  topYInner: number;
  bottomY: number;
  isLeft: boolean;
}): string {
  throw new Error('eyePath: not implemented');
}

/** @internal Exponential smoothing toward a target. */
export function smoothFaceParams(_current: FaceParams, _target: FaceParams, _k: number): FaceParams {
  throw new Error('smoothFaceParams: not implemented');
}
