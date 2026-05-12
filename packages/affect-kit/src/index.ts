// Public API surface for the `affect-kit` package.
//
// Importing this entry registers all four custom elements as a side effect.
// For finer-grained imports, use the per-component entries:
//   import 'affect-kit/rater';
//   import 'affect-kit/result';
//   import 'affect-kit/compare';
//   import 'affect-kit/face';
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

if (!customElements.get('affect-kit-rater'))   customElements.define('affect-kit-rater',   AffectKitRater);
if (!customElements.get('affect-kit-result'))  customElements.define('affect-kit-result',  AffectKitResult);
if (!customElements.get('affect-kit-face'))    customElements.define('affect-kit-face',    AffectKitFace);
if (!customElements.get('affect-kit-compare')) customElements.define('affect-kit-compare', AffectKitCompare);

export { AffectKitRater, AffectKitResult, AffectKitFace, AffectKitCompare };

export type { ColorMode, Rating, EmotionLabel, EmotionName } from './core/types';
export { createRating, averageRatings, stripVad, rehydrate } from './core/vad';
export { EMOTION_LABELS } from './vocabulary/en';
