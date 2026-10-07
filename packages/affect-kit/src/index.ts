// Public API surface for the `affect-kit` package.
//
// Importing this entry registers all five custom elements as a side effect.
// For finer-grained imports, use the per-component entries:
//   import 'affect-kit/rater';
//   import 'affect-kit/result';
//   import 'affect-kit/compare';
//   import 'affect-kit/face';
//   import 'affect-kit/pad';
//
// Registration happens here (not on each class via `@customElement`) so the
// call statements are visible to consumer bundlers as unambiguous side
// effects. With pure re-exports, Vite/Rollup tree-shakes the chunks when
// the consumer's import has no consumed binding (e.g. `import 'affect-kit'`).
//
// Anything not re-exported below is internal and not part of the package's
// supported API. The package.json `exports` map enforces this at the
// resolver level — `affect-kit/core/...` and similar paths are unreachable.

import { AffectKitRater }   from './components/affect-kit-rater';
import { AffectKitResult }  from './components/affect-kit-result';
import { AffectKitFace }    from './components/affect-kit-face';
import { AffectKitCompare } from './components/affect-kit-compare';
import { AffectKitPad }     from './components/affect-kit-pad';

if (!customElements.get('affect-kit-rater'))   customElements.define('affect-kit-rater',   AffectKitRater);
if (!customElements.get('affect-kit-result'))  customElements.define('affect-kit-result',  AffectKitResult);
if (!customElements.get('affect-kit-face'))    customElements.define('affect-kit-face',    AffectKitFace);
if (!customElements.get('affect-kit-compare')) customElements.define('affect-kit-compare', AffectKitCompare);
if (!customElements.get('affect-kit-pad'))     customElements.define('affect-kit-pad',     AffectKitPad);

export { AffectKitRater, AffectKitResult, AffectKitFace, AffectKitCompare, AffectKitPad };

export type { ColorMode, Theme, Layout, PadGlow, Rating, EmotionLabel, EmotionName } from './core/types';
export type { PadPosition } from './components/affect-kit-pad';
export { createRating, averageRatings, stripVad, rehydrate } from './core/vad';
export { EMOTION_LABELS } from './vocabulary/en';
export { SYNONYMS_EN } from './vocabulary/synonyms-en';
export { nearestLabels, completeLabels, labelsInText, type LabelMatch } from './vocabulary/search';
export { surfacePalette, MIN_TEXT_CONTRAST, type SurfacePalette } from './core/palette';
export { SURFACE_MIX } from './core/color';
