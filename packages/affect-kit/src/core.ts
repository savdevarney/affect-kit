// `affect-kit/core` entry: the headless core. Everything a rater needs to draw
// and behave like `<affect-kit-rater>`, as plain data and pure functions, with
// no custom elements and no DOM.
//
// Every other entry registers custom elements as a side effect, and Lit's
// browser build needs `HTMLElement` at import time. React Native, servers
// (Node, Workers, Deno) and web workers import this entry instead. The web
// components are built on the same functions, so a native rater and the web
// one draw the same face, sort the same words and paint the same colors.

// Ratings
export type { Rating, EmotionLabel, EmotionName, ResolvedTheme, PadGlow } from './core/types';
export { createRating, averageRatings, stripVad, rehydrate, ratingPosition } from './core/vad';
export { EMOTION_LABELS } from './vocabulary/en';

// The face: numbers, then paths, then how to draw them
export {
  faceParams, faceGeometry, facePaths, toSvgPath, FACE_PARTS, FACE_BOX,
  type FaceParams, type FacePart, type PathCommand,
} from './core/face-renderer';
export {
  FACE_STYLE, faceInk, FACE_TIERS, faceTier, faceStroke,
  type FacePartStyle, type FaceTier,
} from './core/face-style';

// The face in motion, by time
export {
  smoothFaceParams, faceSettled, kickShock, decayShock, faceMotion, FACE_MOTION,
  type FaceOffsets,
} from './core/motion';

// The rater's behavior, timing and layout
export {
  createRater, raterReducer, canFinish, raterRating, tapShocks,
  RATER_RULES, RATER_TIMING, RATER_LAYOUT, UNSET_FACE,
  type RaterState, type RaterEvent, type Curve,
} from './core/rater';

// The pad and color
export { padToFace, faceToPad, vaColor, padColors } from './core/pad';
export {
  surfacePalette, neutralPalette, wordChipColors, MIN_TEXT_CONTRAST,
  type SurfacePalette, type WordChipColors,
} from './core/palette';
export { SURFACE_MIX } from './core/color';

// The words and their chips
export { wordOrder } from './vocabulary/order';
export {
  chipStyle, BASE_FONT_PX, WORD_LIST_GAP,
  type ChipStyle, type ChipColors, type ChipLevel, type ChipRing,
} from './core/chip';

// Accessibility
export {
  A11Y_STRINGS_EN, describeFace, axisValueText, nudgeFace, chipLabel, chipA11y, FACE_STEPS,
  type A11yStrings, type FaceAxis,
} from './core/a11y';
