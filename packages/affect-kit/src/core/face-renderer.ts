// Pure module: valence and arousal → the face's numbers → its paths.
// No DOM, no Lit, no state. Face anatomy based on FACS (Ekman & Friesen 1978).
// Cross-cultural validation: Cordaro et al. 2018 (17 cultures).
//
// Functions on the per-frame path start with a 'worklet' directive. React
// Native Reanimated reads it to run the function on the UI thread; anywhere
// else it's a plain string statement that does nothing. Worklets can only call
// other worklets and read module constants, so these never close over state.

/**
 * The face's eleven numbers: brows, lids and mouth. Native and web renderers
 * animate these, then rebuild the paths each frame. Interpolating the path
 * strings themselves would morph differently.
 */
export interface FaceParams {
  browInnerY: number;
  browOuterY: number;
  eyeWidth: number;
  thicknessTop: number;
  thicknessBottom: number;
  topAsymmetry: number;
  /** Crow's-feet opacity, 0 to 0.7: only a strong, pleasant, energized face shows them. */
  crowsFeetOp: number;
  mouthCornerY: number;
  mouthMidY: number;
  mouthWidth: number;
  mouthOpen: number;
}

/**
 * One drawing command in face units, with absolute coordinates, as in SVG path
 * data. Skia can build a path from these without parsing a string.
 */
export type PathCommand =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'Q'; x1: number; y1: number; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

/** The face's parts, back to front: the order to draw them in. */
export const FACE_PARTS = [
  'leftBrow', 'rightBrow', 'leftEye', 'rightEye', 'crowsFeetLeft', 'crowsFeetRight', 'nose', 'mouth',
] as const;

export type FacePart = (typeof FACE_PARTS)[number];

/** The face's coordinate space: -85 to 85 on both axes, centred on the face. */
export const FACE_BOX = { x: -85, y: -85, width: 170, height: 170 } as const;

/** @internal {@link FACE_BOX} as an SVG `viewBox`. */
export const FACE_VIEWBOX = `${FACE_BOX.x} ${FACE_BOX.y} ${FACE_BOX.width} ${FACE_BOX.height}`;

// ─── The numbers ───────────────────────────────────────────────────────────

/**
 * The face's numbers at a position. `v` and `a` are clamped to [-1, 1].
 *
 * Four quadrant expressions blend by weight: anger (v < 0, a > 0), joy
 * (v > 0, a > 0), calm (v > 0, a < 0) and sadness (v < 0, a < 0). Each weight
 * is the product of the clipped components, so the face changes smoothly
 * everywhere.
 *
 * ```ts
 * const p = faceParams(0.6, 0.4);
 * const paths = facePaths(p); // draw them, or animate p first
 * ```
 */
export function faceParams(v: number, a: number): FaceParams {
  'worklet';
  const cv = Math.max(-1, Math.min(1, v));
  const ca = Math.max(-1, Math.min(1, a));
  const angerW = Math.max(0, -cv) * Math.max(0,  ca);
  const joyW   = Math.max(0,  cv) * Math.max(0,  ca);
  const calmW  = Math.max(0,  cv) * Math.max(0, -ca);
  const sadW   = Math.max(0, -cv) * Math.max(0, -ca);
  const aPos   = Math.max(0, ca);  // positive arousal component only

  // ── Brows ──
  // baseline: -32 (slightly above eye center at y=-12)
  let browInnerY = -32;
  let browOuterY = -32;
  browInnerY += angerW * 9;   // anger: inner brow lowered (furrowed)
  browOuterY += angerW * 1;
  browInnerY -= sadW   * 9;   // sad:   inner brow raised (AU 1+2)
  browOuterY += sadW   * 5;
  browInnerY -= joyW   * 3;   // joy:   a gentle lift, the inner end a touch higher (soft, open)
  browOuterY -= joyW   * 2;
  browInnerY -= aPos   * 1.5; // arousal raises the whole brow
  browOuterY -= aPos   * 1.5;
  // Only anger lowers the inner end below the outer: that V is the anger cue, so a pleasant face
  // never gets one (a raised outer brow over a smile read as an "angry smile").
  // Invariant, tested: with angerW === 0, browInnerY <= browOuterY + 0.5.

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
  const mouthCornerY = 32 - cv * 9;  // positive V → corners up
  const mouthMidY    = 32 + cv * 20; // positive V → mid point up (wider smile arc)
  let mouthWidth     = 22 + aPos * 3;
  let mouthOpen      = aPos * 6;     // arousal → mouth open

  mouthWidth -= angerW * 4;          // anger: tight/narrow
  mouthWidth += joyW   * 2;          // joy: wide
  mouthOpen  *= (1 - sadW * 0.6);    // sadness dampens mouth opening

  return {
    browInnerY, browOuterY,
    eyeWidth, thicknessTop, thicknessBottom, topAsymmetry,
    crowsFeetOp,
    mouthCornerY, mouthMidY, mouthWidth, mouthOpen,
  };
}

// ─── The paths ─────────────────────────────────────────────────────────────

// One eye: a cubic top lid (asymmetric for the anger frown) and a quadratic
// underside. y = -12 is the centre of both eyes.
function eyeCommands(
  cx: number, width: number, topYOuter: number, topYInner: number, bottomY: number, isLeft: boolean,
): PathCommand[] {
  'worklet';
  const cy = -12;
  const outerX = cx + (isLeft ? -width : width);
  const innerX = cx + (isLeft ? width : -width);
  return [
    { op: 'M', x: outerX, y: cy },
    {
      op: 'C',
      x1: outerX + (innerX - outerX) * 0.33, y1: topYOuter,
      x2: outerX + (innerX - outerX) * 0.67, y2: topYInner,
      x: innerX, y: cy,
    },
    { op: 'Q', x1: cx, y1: bottomY, x: outerX, y: cy },
    { op: 'Z' },
  ];
}

/** Every part's path for a set of numbers, as commands. Same shapes as {@link facePaths}. */
export function faceGeometry(p: FaceParams): Record<FacePart, PathCommand[]> {
  'worklet';
  const browMidY = (p.browOuterY + p.browInnerY) / 2 - 2;
  const cy = -12;
  const topYOuter = cy - p.thicknessTop;
  const topYInner = cy - p.thicknessTop * (1 - p.topAsymmetry);
  const bottomY = cy + p.thicknessBottom;
  // Closed, the mouth is a zero-area arc that the stroke alone makes visible;
  // open, it's a filled shape between an upper and a lower arc.
  const upperY = p.mouthMidY - p.mouthOpen * 0.35;
  const lowerY = p.mouthMidY + p.mouthOpen * 0.65;
  return {
    leftBrow: [
      { op: 'M', x: -42, y: p.browOuterY },
      { op: 'Q', x1: -27, y1: browMidY, x: -12, y: p.browInnerY },
    ],
    rightBrow: [
      { op: 'M', x: 12, y: p.browInnerY },
      { op: 'Q', x1: 27, y1: browMidY, x: 42, y: p.browOuterY },
    ],
    leftEye: eyeCommands(-28, p.eyeWidth, topYOuter, topYInner, bottomY, true),
    rightEye: eyeCommands(28, p.eyeWidth, topYOuter, topYInner, bottomY, false),
    crowsFeetLeft: [
      { op: 'M', x: -41, y: -10 }, { op: 'L', x: -47, y: -14 },
      { op: 'M', x: -41, y: -7 }, { op: 'L', x: -48, y: -8 },
    ],
    crowsFeetRight: [
      { op: 'M', x: 41, y: -10 }, { op: 'L', x: 47, y: -14 },
      { op: 'M', x: 41, y: -7 }, { op: 'L', x: 48, y: -8 },
    ],
    nose: [
      { op: 'M', x: -3, y: 5 },
      { op: 'Q', x1: 0, y1: 9, x: 3, y: 5 },
    ],
    mouth: [
      { op: 'M', x: -p.mouthWidth, y: p.mouthCornerY },
      { op: 'Q', x1: 0, y1: upperY, x: p.mouthWidth, y: p.mouthCornerY },
      { op: 'Q', x1: 0, y1: lowerY, x: -p.mouthWidth, y: p.mouthCornerY },
      { op: 'Z' },
    ],
  };
}

// Two decimals is a hundredth of a face unit: invisible at any size.
function fmt(n: number): string {
  'worklet';
  return String(Math.round(n * 100) / 100);
}

/** SVG path data for one part's commands: `"M -42 -32 Q -27 -34 -12 -32"`. */
export function toSvgPath(commands: readonly PathCommand[]): string {
  'worklet';
  let d = '';
  for (const c of commands) {
    if (d) d += ' ';
    switch (c.op) {
      case 'M':
      case 'L': d += `${c.op} ${fmt(c.x)} ${fmt(c.y)}`; break;
      case 'Q': d += `Q ${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`; break;
      case 'C': d += `C ${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`; break;
      case 'Z': d += 'Z'; break;
    }
  }
  return d;
}

/**
 * SVG path data for every part: for react-native-svg and the web. Draw them in
 * {@link FACE_PARTS} order with {@link FACE_STYLE}, in `faceInk(theme)`.
 */
export function facePaths(p: FaceParams): Record<FacePart, string> {
  'worklet';
  const g = faceGeometry(p);
  return {
    leftBrow: toSvgPath(g.leftBrow),
    rightBrow: toSvgPath(g.rightBrow),
    leftEye: toSvgPath(g.leftEye),
    rightEye: toSvgPath(g.rightEye),
    crowsFeetLeft: toSvgPath(g.crowsFeetLeft),
    crowsFeetRight: toSvgPath(g.crowsFeetRight),
    nose: toSvgPath(g.nose),
    mouth: toSvgPath(g.mouth),
  };
}
