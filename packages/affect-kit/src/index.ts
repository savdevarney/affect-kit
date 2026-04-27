// Public API surface for the `affect-kit` package.
//
// Importing this entry registers all three custom elements as a side effect.
// For finer-grained imports, use the per-component entries:
//   import 'affect-kit/rater';
//   import 'affect-kit/result';
//   import 'affect-kit/face';
//
// Anything not re-exported below is internal and not part of the package's
// supported API. The package.json `exports` map enforces this at the
// resolver level — `affect-kit/core/...` and similar paths are unreachable.

import './components/affect-kit-rater';
import './components/affect-kit-result';
import './components/affect-kit-face';

export { AffectKitRater } from './components/affect-kit-rater';
export { AffectKitResult } from './components/affect-kit-result';
export { AffectKitFace } from './components/affect-kit-face';

export type { Rating, EmotionLabel } from './core/types';
